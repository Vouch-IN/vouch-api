import { DEFAULT_VALIDATIONS } from '../constants'
import { createClient } from '../lib/supabase'
import { handleError } from '../middleware'
import { type ProjectSettings, type Tables } from '../types'
import { createLogger, errorResponse } from '../utils'

const logger = createLogger({ service: 'webhook' })

type ApiKeyPayload = WebhookPayload<Tables<'api_keys'>>

type ProjectPayload = WebhookPayload<Tables<'projects'>>

type WebhookPayload<T = unknown> = {
	new_row: T
	old_row: T
	operation: 'DELETE' | 'INSERT' | 'UPDATE'
	table: string
	timestamp: string
}

export async function handleWebhook(request: Request, env: Env): Promise<Response> {
	// Verify webhook secret for security
	const webhookSecret = request.headers.get('x-webhook-token')
	if (webhookSecret !== env.WEBHOOK_SECRET) {
		logger.warn('Unauthorized webhook request - invalid secret')
		return errorResponse('unauthorized', 'Unauthorized', 401)
	}

	const payload: ApiKeyPayload | WebhookPayload = await request.json()
	const { operation, table } = payload

	try {
		if (table === 'api_keys') {
			await handleApiKeyChange(payload as ApiKeyPayload, operation, env)
		} else if (table === 'projects') {
			await handleProjectChange(payload as ProjectPayload, operation, env)
		} else {
			logger.warn('Unknown table in webhook', { table })
		}

		return Response.json({ success: true })
	} catch (error) {
		logger.error('Webhook processing failed', error, { operation, table })
		return handleError(error)
	}
}

async function handleApiKeyChange(
	payload: ApiKeyPayload,
	operation: 'DELETE' | 'INSERT' | 'UPDATE',
	env: Env
): Promise<void> {
	const apiKey = operation === 'DELETE' ? payload.old_row : payload.new_row
	const cacheKey = `apikey:${apiKey.key_hash}`

	if (operation === 'DELETE') {
		// Remove from cache if deleted or revoked
		await env.PROJECT_SETTINGS.delete(cacheKey)
	} else {
		// Update cache with fresh data
		await env.PROJECT_SETTINGS.put(cacheKey, JSON.stringify(apiKey))
	}
}

async function handleProjectChange(
	payload: ProjectPayload,
	operation: 'DELETE' | 'INSERT' | 'UPDATE',
	env: Env
): Promise<void> {
	const project = operation === 'DELETE' ? payload.old_row : payload.new_row
	const cacheKey = `project:${project.slug}`

	if (operation === 'DELETE') {
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
    	interval,
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
			logger.error('Failed to fetch project data from webhook', error, { projectId: project.id })
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
			subscription: subscription
				? {
						billingCycle: subscription.interval,
						currentPeriodEnd: subscription.current_period_end,
						currentPeriodStart: subscription.current_period_start,
						status: subscription.status
					}
				: undefined,
			validations: {
				...DEFAULT_VALIDATIONS,
				...settings?.validations
			},
			whitelist: settings?.whitelist ?? []
		}

		await env.PROJECT_SETTINGS.put(cacheKey, JSON.stringify(projectSettings))
	}
}
