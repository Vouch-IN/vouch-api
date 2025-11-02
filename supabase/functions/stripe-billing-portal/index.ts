import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { initStripe } from '../_shared/stripe.ts'
import { authenticateUser, initSupabaseClients } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { handleError, successResponse } from '../_shared/errors.ts'

import { createBillingPortalSession } from './billing.ts'
import { findProject } from './project.ts'
import { validateRequest } from './validations.ts'

/**
 * CREATE BILLING PORTAL SESSION
 *
 * Purpose: Generate a Stripe Billing Portal session URL for customers to manage their subscription
 *
 * Use cases:
 * 1. View and update payment methods
 * 2. View invoices and payment history
 * 3. Update subscription (upgrade/downgrade)
 * 4. Cancel subscription
 *
 * Required fields:
 * - project_id: UUID of the project
 * - return_url: URL to redirect back to after managing billing
 *
 * Security:
 * - User must have 'manage_billing' permission on the project
 * - Project must have an active Stripe customer ID
 */

const stripe = initStripe()

Deno.serve(async (req) => {
	// Handle CORS preflight
	if (req.method === 'OPTIONS') {
		return handleCors()
	}

	try {
		// Authenticate user
		const { supabaseClient } = await authenticateUser(req)
		const { supabaseAdmin } = initSupabaseClients(req.headers.get('Authorization'))

		// Parse and validate request
		const body = await req.json()
		const request = validateRequest(body)

		console.log(`🚀 Creating billing portal session for project ${request.project_id}`)

		// Step 1: Find project and verify access
		const project = await findProject(supabaseAdmin, supabaseClient, request.project_id)

		console.log(`✅ Project found: ${project.id}`)

		// Step 2: Create Stripe Billing Portal Session
		const { sessionId, sessionUrl } = await createBillingPortalSession(
			stripe,
			project.stripe_customer_id,
			request.return_url
		)

		return successResponse({
			billing_session_id: sessionId,
			billing_url: sessionUrl
		})
	} catch (error) {
		return handleError(error)
	}
})
