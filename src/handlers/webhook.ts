import { DEFAULT_RISK_WEIGHTS, DEFAULT_THRESHOLDS, DEFAULT_VALIDATIONS } from '../constants'
import { createClient } from '../lib/supabase'
import { handleError } from '../middleware'
import { type ProjectSettings, type SubscriptionMetadata, type Tables } from '../types'
import { errorResponse } from '../utils'

type ApiKeyPayload = WebhookPayload<Tables<'api_keys'>>

type ProjectPayload = WebhookPayload<Tables<'projects'>>

type WebhookPayload<T = unknown> = {
	new: T
	old: T
	table: string
	type: 'DELETE' | 'INSERT' | 'UPDATE'
}

export async function handleWebhook(request: Request, env: Env): Promise<Response> {
	// Verify webhook secret for security
	const webhookSecret = request.headers.get('x-webhook-token')
	if (webhookSecret !== env.WEBHOOK_SECRET) {
		return errorResponse('unauthorized', 'Unauthorized', 401)
	}

	const payload: ApiKeyPayload | WebhookPayload = await request.json()
	const { table, type } = payload

	try {
		if (table === 'api_keys') {
			await handleApiKeyChange(payload as ApiKeyPayload, type, env)
		} else if (table === 'projects') {
			await handleProjectChange(payload as ProjectPayload, type, env)
		}

		return Response.json({ success: true })
	} catch (error) {
		console.error('Webhook processing error:', error)
		return handleError(error)
	}
}

async function handleApiKeyChange(
	payload: ApiKeyPayload,
	type: 'DELETE' | 'INSERT' | 'UPDATE',
	env: Env
): Promise<void> {
	const apiKey = type === 'DELETE' ? payload.old : payload.new

	const cacheKey = `apikey:${apiKey.key_hash}`

	if (type === 'DELETE' || apiKey.revoked_at) {
		// Remove from cache if deleted or revoked
		await env.PROJECT_SETTINGS.delete(cacheKey)
	} else {
		// Update cache with fresh data
		await env.PROJECT_SETTINGS.put(cacheKey, JSON.stringify(apiKey))
	}
}

async function handleProjectChange(
	payload: ProjectPayload,
	type: 'DELETE' | 'INSERT' | 'UPDATE',
	env: Env
): Promise<void> {
	const project = type === 'DELETE' ? payload.old : payload.new

	const cacheKey = `project:${project.id}`

	if (type === 'DELETE') {
		// Remove from cache if deleted
		await env.PROJECT_SETTINGS.delete(cacheKey)
	} else {
		// Fetch full project data with subscriptions
		const client = createClient(env)
		const { data, error } = await client
			.from('projects')
			.select('*, subscriptions(*)')
			.eq('id', project.id)
			.single()

		if (error ?? !data) {
			console.error('Failed to fetch project:', error)
			return
		}

		const settings = data.settings as null | ProjectSettings
		const subscriptions = data.subscriptions
		const subscription = subscriptions[0]

		const projectSettings = {
			blacklist: settings?.blacklist ?? [],
			entitlements: settings?.entitlements ?? {},
			projectId: data.id,
			riskWeights: {
				...DEFAULT_RISK_WEIGHTS,
				...settings?.riskWeights
			},
			subscription: subscription
				? {
						billingCycle: (subscription.billing_cycle ??
							'custom') as SubscriptionMetadata['billingCycle'],
						currentPeriodEnd: subscription.current_period_end,
						currentPeriodStart: subscription.current_period_start,
						status: subscription.status
					}
				: undefined,
			thresholds: {
				...DEFAULT_THRESHOLDS,
				...settings?.thresholds
			},
			validations: {
				...DEFAULT_VALIDATIONS,
				...settings?.validations
			},
			whitelist: settings?.whitelist ?? []
		}

		await env.PROJECT_SETTINGS.put(cacheKey, JSON.stringify(projectSettings))
	}
}
