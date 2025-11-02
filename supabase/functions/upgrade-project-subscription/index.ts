import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { authenticateUser, initSupabaseClients, verifyProjectAccess } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { handleError, successResponse, ValidationError } from '../_shared/errors.ts'
import { createCheckoutSession, getOrCreateStripeCustomer, initStripe } from '../_shared/stripe.ts'

import { validateRequest } from './validations.ts'

/**
 * UPGRADE PROJECT SUBSCRIPTION
 *
 * Purpose: Add or change subscription for an existing project
 *
 * Use cases:
 * 1. Upgrade free tier to paid
 * 2. Change subscription plan
 * 3. Reactivate cancelled subscription
 *
 * Required fields:
 * - project_id: UUID of existing project
 * - price_id: Stripe price ID to subscribe to
 * - success_url: Redirect URL after successful payment
 * - cancel_url: Redirect URL if user cancels
 *
 * Security:
 * - User must have 'manage_billing' permission on the project
 * - Uses the project's existing billing email or owner's email
 */

const stripe = initStripe()

Deno.serve(async (req) => {
	// Handle CORS preflight
	if (req.method === 'OPTIONS') {
		return handleCors()
	}

	// Only allow POST
	if (req.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 })
	}

	try {
		// Authenticate user
		const { user, supabaseClient } = await authenticateUser(req)
		const { supabaseAdmin } = initSupabaseClients(req.headers.get('Authorization'))

		// Parse and validate request
		const body = await req.json()
		const request = validateRequest(body)

		console.log(`🚀 Upgrading subscription for project ${request.project_id}`)

		// Verify user has permission to manage billing for this project
		await verifyProjectAccess(supabaseClient, request.project_id, 'manage billing')

		// Get project details
		const { data: project, error: projectError } = await supabaseAdmin
			.from('projects')
			.select('id, name, slug, owner_id, stripe_customer_id')
			.eq('id', request.project_id)
			.single()

		if (projectError || !project) {
			throw new ValidationError('Project not found')
		}

		console.log(`✅ Found project: ${project.id} (slug: ${project.slug})`)

		// Get billing email - try to use owner's email
		const { data: owner } = await supabaseAdmin.auth.admin.getUserById(project.owner_id)

		if (!owner.user?.email) {
			throw new Error('Project owner email not found. Cannot create Stripe customer.')
		}

		const billingEmail = owner.user.email

		// Get or create Stripe customer
		const customerId = await getOrCreateStripeCustomer(
			stripe,
			project,
			billingEmail
		)

		// Update project with Stripe customer ID if it was just created
		if (!project.stripe_customer_id) {
			await supabaseAdmin
				.from('projects')
				.update({ stripe_customer_id: customerId })
				.eq('id', project.id)
				.throwOnError()

			console.log(`✅ Project ${project.id} linked to Stripe customer ${customerId}`)
		}

		// Create checkout session
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
			project: {
				id: project.id,
				name: project.name,
				slug: project.slug
			},
			message: 'Checkout session created successfully'
		})
	} catch (error) {
		return handleError(error)
	}
})
