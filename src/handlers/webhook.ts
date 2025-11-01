import { DEFAULT_RISK_WEIGHTS, DEFAULT_THRESHOLDS, DEFAULT_VALIDATIONS } from '../constants'
import { createClient } from '../lib/supabase'
import { handleError } from '../middleware'
import { type ProjectSettings, type Tables } from '../types'
import { errorResponse } from '../utils'

type ApiKeyPayload = WebhookPayload<Tables<'api_keys'>>

type ProjectPayload = WebhookPayload<Tables<'projects'>>

type WebhookPayload<T = unknown> = {
	old_record: T
	record: T
	schema: string
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
	const apiKey = type === 'DELETE' ? payload.old_record : payload.record

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
	const project = type === 'DELETE' ? payload.old_record : payload.record

	const cacheKey = `project:${project.id}`

	if (type === 'DELETE') {
		// Remove from cache if deleted
		await env.PROJECT_SETTINGS.delete(cacheKey)
	} else {
		// Fetch full project data with subscriptions
		const client = createClient(env)
		const { data, error } = await client
			.from('projects')
			.select(
				`
    *,
    subscription:stripe_subscriptions!inner(
      status,
      current_period_start,
      current_period_end
    ),
    entitlement:entitlements!inner(
      team_limit,
      validations_limit,
      log_retention_days,
      features,
      starts_at,
      ends_at
    )
  `
			)
			.eq('id', project.id)
			.maybeSingle()

		if (error ?? !data) {
			console.error('Failed to fetch project:', error)
			return
		}

		const settings = data.settings as null | ProjectSettings
		const subscription = data.subscription?.[0]
		const entitlement = data.entitlement?.[0]

		const projectSettings = {
			blacklist: settings?.blacklist ?? [],
			entitlements: entitlement
				? {
						endsAt: entitlement.ends_at,
						features: entitlement.features,
						logRetentionDays: entitlement.log_retention_days,
						startsAt: entitlement.starts_at,
						teamLimit: entitlement.team_limit,
						validationsLimit: entitlement.validations_limit
					}
				: {
						endsAt: null,
						features: [],
						logRetentionDays: 7,
						startsAt: new Date().toISOString(),
						teamLimit: 1,
						validationsLimit: 1000
					},
			projectId: data.id,
			riskWeights: {
				...DEFAULT_RISK_WEIGHTS,
				...settings?.riskWeights
			},
			subscription: subscription
				? {
						billingCycle: 'monthly' as const, // Derive from subscription interval if needed
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
