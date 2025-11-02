import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import slugify from 'npm:slugify@1.6.6'

import { authenticateUser, initSupabaseClients } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { handleError, successResponse, ValidationError } from '../_shared/errors.ts'
import { createCheckoutSession, getOrCreateStripeCustomer, initStripe } from '../_shared/stripe.ts'

import { validateRequest } from './validations.ts'

/**
 * CREATE PROJECT CHECKOUT
 *
 * Purpose: Create a new project and optionally set up billing during signup
 *
 * Use cases:
 * 1. Free tier signup: Create project with free entitlements
 * 2. Paid tier signup: Create project + Stripe customer + checkout session
 *
 * Required fields:
 * - project_name: Display name for the project
 * - billing_email: Email for billing (becomes project contact)
 * - is_free: true for free tier, false for paid
 *
 * Additional fields for paid tier (is_free=false):
 * - price_id: Stripe price ID to subscribe to
 * - success_url: Where to redirect after successful payment
 * - cancel_url: Where to redirect if user cancels
 *
 * Optional fields:
 * - project_slug: Custom slug (will be generated if not provided)
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
		const { user } = await authenticateUser(req)
		const { supabaseAdmin } = initSupabaseClients(req.headers.get('Authorization'))

		// Parse and validate request
		const body = await req.json()
		const request = validateRequest(body)

		console.log(`🚀 Creating project for user ${user.id}`)

		// Generate slug if not provided
		const slug = request.project_slug || slugify(request.project_name, {
			lowercase: true,
			strict: true
		})

		// Check if slug is already taken
		const { data: existingProject } = await supabaseAdmin
			.from('projects')
			.select('id')
			.eq('slug', slug)
			.maybeSingle()

		if (existingProject) {
			throw new ValidationError(`Project slug "${slug}" is already taken. Please choose a different project name or provide a custom slug.`)
		}

		// Create the project
		const { data: project, error: projectError } = await supabaseAdmin
			.from('projects')
			.insert({
				name: request.project_name,
				slug: slug,
				owner_id: user.id
			})
			.select('*')
			.single()

		if (projectError) {
			throw new Error(`Failed to create project: ${projectError.message}`)
		}

		console.log(`✅ Project created: ${project.id} (slug: ${slug})`)

		// Handle free tier - create free entitlement and return early
		if (request.is_free) {
			// Create free tier entitlement
			const { error: entitlementError } = await supabaseAdmin
				.from('entitlements')
				.insert({
					project_id: project.id,
					source: 'free',
					validations_limit: 1000,
					team_limit: 1,
					log_retention_days: 7,
					features: [],
					starts_at: new Date().toISOString()
				})

			if (entitlementError) {
				console.error('Failed to create free entitlement:', entitlementError)
				// Don't fail the whole request - entitlements will be created by default anyway
			} else {
				console.log(`✅ Free tier entitlement created for project ${project.id}`)
			}

			return successResponse({
				project,
				checkout_session_id: null,
				checkout_url: null,
				message: 'Project created successfully with free tier access'
			})
		}

		// Handle paid tier - create Stripe customer and checkout session
		console.log(`💳 Setting up paid subscription for project ${project.id}`)

		// Create Stripe customer
		const customerId = await getOrCreateStripeCustomer(
			stripe,
			project,
			request.billing_email
		)

		// Update project with Stripe customer ID
		await supabaseAdmin
			.from('projects')
			.update({ stripe_customer_id: customerId })
			.eq('id', project.id)
			.throwOnError()

		console.log(`✅ Project ${project.id} linked to Stripe customer ${customerId}`)

		// Create checkout session
		const { sessionId, sessionUrl } = await createCheckoutSession(
			stripe,
			customerId,
			request.price_id!,
			request.success_url!,
			request.cancel_url!
		)

		return successResponse({
			project,
			checkout_session_id: sessionId,
			checkout_url: sessionUrl,
			message: 'Project created successfully. Complete checkout to activate subscription.'
		})
	} catch (error) {
		return handleError(error)
	}
})
