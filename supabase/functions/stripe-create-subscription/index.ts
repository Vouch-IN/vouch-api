import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@19.1.0'

import { attachPaymentMethod, createStripeCustomer } from './customer.ts'
import { AuthenticationError, handleError } from './errors.ts'
import { createProject } from './project.ts'
import { createSubscription, validateProject } from './subscription.ts'
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
		console.log(`🚀 Creating subscription for project: ${request.project_id}`)
		// Validate project doesn't exist
		await validateProject(supabaseAdmin, request.project_id, request.project_slug)
		// Get or create Stripe customer
		const customer_id = await createStripeCustomer(stripe, supabaseAdmin, request.billing_email, {
			owner_id: request.owner_id,
			project_id: request.project_id
		})
		// Only attach payment method for paid plans
		if (request.payment_method_id) {
			await attachPaymentMethod(stripe, customer_id, request.payment_method_id)
		}
		// Create project
		const project = await createProject(
			supabaseAdmin,
			request.project_id,
			request.project_slug,
			request.project_name,
			request.owner_id,
			customer_id
		)
		// Create subscription
		const { clientSecret, status, subscriptionId } = await createSubscription(
			stripe,
			customer_id,
			request.price_id,
			{
				billing_email: request.billing_email,
				owner_id: request.owner_id,
				project_id: request.project_id
			}
		)
		const response = {
			client_secret: clientSecret,
			project,
			status,
			subscription_id: subscriptionId
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
