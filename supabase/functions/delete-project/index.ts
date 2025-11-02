import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import Stripe from 'npm:stripe@19.1.0'

import { authenticateUser, initSupabaseClients } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { AuthorizationError, handleError, NotFoundError, successResponse } from '../_shared/errors.ts'
import { isValidUUID, validateRequired } from '../_shared/validation.ts'

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
		const { user } = await authenticateUser(req)
		const { supabaseAdmin } = initSupabaseClients(req.headers.get('Authorization'))

		// Parse and validate request
		const body = await req.json()
		validateRequired(body, ['id'])

		const { id: projectId } = body

		// Validate UUID format
		if (!isValidUUID(projectId)) {
			throw new Error('Invalid project ID format')
		}

		// Verify project exists and get details
		const { data: project, error } = await supabaseAdmin
			.from('projects')
			.select('name, owner_id, stripe_customer_id')
			.eq('id', projectId)
			.is('deleted_at', null)
			.single()

		if (error || !project) {
			throw new NotFoundError('Project not found')
		}

		// Only owner can delete (more restrictive than can_manage_project for destructive operations)
		if (project.owner_id !== user.id) {
			throw new AuthorizationError('Only the project owner can delete this project')
		}

		console.log(`🗑️ Deleting project: ${projectId}`)

		// Step 1: Cancel Stripe subscription if exists
		if (project.stripe_customer_id) {
			try {
				console.log(`💳 Checking Stripe subscriptions for customer: ${project.stripe_customer_id}`)

				// List all active subscriptions for this customer
				const subscriptions = await stripe.subscriptions.list({
					customer: project.stripe_customer_id,
					status: 'active'
				})

				// Cancel each active subscription
				for (const subscription of subscriptions.data) {
					console.log(`🔴 Cancelling subscription: ${subscription.id}`)
					await stripe.subscriptions.cancel(subscription.id)
				}

				if (subscriptions.data.length > 0) {
					console.log(`✅ Cancelled ${subscriptions.data.length} Stripe subscription(s)`)
				} else {
					console.log(`ℹ️ No active Stripe subscriptions found`)
				}
			} catch (stripeError) {
				// Log error but don't fail the entire deletion
				console.error('⚠️ Failed to cancel Stripe subscription:', stripeError)
				// Continue with project deletion even if Stripe cancellation fails
			}
		}

		// Step 2: Delete project using transactional RPC
		const { error: deleteError } = await supabaseAdmin.rpc('delete_project_cascade', {
			project_id_param: projectId
		})

		if (deleteError) {
			console.error('Delete error:', deleteError)
			throw new Error('Failed to delete project')
		}

		console.log(`✅ Project ${projectId} deleted`)

		return successResponse({
			success: true,
			message: `${project.name} has been deleted`
		})
	} catch (error) {
		return handleError(error)
	}
})
