import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import Stripe from 'npm:stripe@19.1.0'

import { authenticateUser, initSupabaseClients } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { handleError, successResponse } from '../_shared/errors.ts'

import { createBillingPortalSession } from './billing.ts'
import { findProject } from './project.ts'
import { validateRequest } from './validations.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'), {
	apiVersion: '2025-09-30.clover'
})

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

		console.log(`🚀 Processing project and billing portal session`)

		// Step 1: Find project
		const project = await findProject(supabaseAdmin, supabaseClient, request.project_id)

		console.log(`📦 Project: ${project.id}`)
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
