import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@19.1.0'

import { createStripeCustomer } from './customer.ts'
import { AuthenticationError, handleError } from './errors.ts'
import { createProject } from './project.ts'
import { createCheckoutSession, validateProject } from './subscription.ts'
import { validateRequest } from './validations.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'), {
	apiVersion: '2025-09-30.clover'
})

const supabaseAdmin = createClient(
	Deno.env.get('SUPABASE_URL'),
	Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)

const corsHeaders = {
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Origin': '*'
}

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', {
			headers: corsHeaders
		})
	}
	try {
		// Authenticate user
		const authHeader = req.headers.get('Authorization')
		if (!authHeader) {
			throw new AuthenticationError('Missing authorization header')
		}
		const supabaseClient = createClient(
			Deno.env.get('SUPABASE_URL'),
			Deno.env.get('SUPABASE_ANON_KEY'),
			{
				global: {
					headers: {
						Authorization: authHeader
					}
				}
			}
		)
		const {
			data: { user },
			error: userError
		} = await supabaseClient.auth.getUser()
		if (userError || !user) {
			throw new AuthenticationError('Unauthorized')
		}

		// Parse and validate request
		const body = await req.json()
		const request = validateRequest(body)

		// Verify user is the owner
		if (request.owner_id !== user.id) {
			throw new AuthenticationError('User ID mismatch')
		}

		console.log(`🚀 Creating project and checkout session: ${request.project_id}`)

		// Validate project doesn't exist
		await validateProject(supabaseAdmin, request.project_id, request.project_slug)

		// Step 1: Create Stripe customer FIRST with project-id in metadata
		const customerId = await createStripeCustomer(stripe, request.billing_email, request.project_id)

		// Step 2: Create project with stripe_customer_id
		const project = await createProject(
			supabaseAdmin,
			request.project_id,
			request.project_slug,
			request.project_name,
			request.owner_id,
			customerId
		)

		// Step 3: Create Stripe Checkout Session
		// The subscription will be created when user completes checkout
		// Webhook will handle connecting it to the project via customer ID
		const { sessionId, sessionUrl } = await createCheckoutSession(
			stripe,
			customerId,
			request.price_id,
			request.success_url,
			request.cancel_url
		)

		const response = {
			checkout_session_id: sessionId,
			checkout_url: sessionUrl,
			project
		}

		return new Response(JSON.stringify(response), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 200
		})
	} catch (error) {
		return handleError(error)
	}
})
