import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import Stripe from 'npm:stripe@19.1.0'

import { authenticateUser, initSupabaseClients } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { AuthenticationError, handleError, successResponse } from '../_shared/errors.ts'
import { getOrCreateStripeCustomer } from './customer.ts'
import { findOrCreateProject, updateProjectStripeCustomer } from './project.ts'
import { createCheckoutSession } from './subscription.ts'
import { validateRequest } from './validations.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
	apiVersion: '2025-09-30.clover'
})

Deno.serve(async (req) => {
	// Handle CORS preflight
	if (req.method === 'OPTIONS') {
		return handleCors()
	}

	try {
		// Authenticate user
		const { user, supabaseClient } = await authenticateUser(req)
		const { supabaseAdmin } = initSupabaseClients(req.headers.get('Authorization'))

		// Parse and validate request
		const body = await req.json()
		const request = validateRequest(body)

		// Verify user is the owner
		if (request.owner_id !== user.id) {
			throw new AuthenticationError('User ID mismatch')
		}

		console.log(`🚀 Processing project and checkout session`)

		// Step 1: Find or create project
		// If project exists (by ID or slug), verify access and return it
		// If not, create it with provided or generated slug
		const project = await findOrCreateProject(
			supabaseAdmin,
			supabaseClient,
			request.owner_id,
			request.project_name,
			request.project_id,
			request.project_slug
		)

		console.log(`📦 Project: ${project.id} (slug: ${project.slug})`)

		// Step 2: Get or create Stripe customer
		// If project has stripe_customer_id, use it
		// Otherwise, create new customer and update project
		const customerId = await getOrCreateStripeCustomer(
			stripe,
			project,
			request.billing_email
		)

		// Update project with customer ID if it was just created
		if (!project.stripe_customer_id) {
			await updateProjectStripeCustomer(supabaseAdmin, project.id, customerId)
			project.stripe_customer_id = customerId
		}

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

		return successResponse({
			checkout_session_id: sessionId,
			checkout_url: sessionUrl,
			project
		})
	} catch (error) {
		return handleError(error)
	}
})
