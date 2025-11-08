import { DEFAULT_RISK_WEIGHTS, DEFAULT_THRESHOLDS, DEFAULT_VALIDATIONS } from '../constants'
import { createClient } from '../lib/supabase'
import { handleError } from '../middleware'
import { type ProjectSettings, type Tables } from '../types'
import { createLogger, errorResponse } from '../utils'

const logger = createLogger({ service: 'webhook' })

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
	logger.info('Received webhook request')

	// Verify webhook secret for security
	const webhookSecret = request.headers.get('x-webhook-token')
	if (webhookSecret !== env.WEBHOOK_SECRET) {
		logger.warn('Unauthorized webhook request - invalid secret')
		return errorResponse('unauthorized', 'Unauthorized', 401)
	}

	const payload: ApiKeyPayload | WebhookPayload = await request.json()
	const { table, type } = payload
	logger.info('Processing webhook event', { table, type })

	try {
		if (table === 'api_keys') {
			await handleApiKeyChange(payload as ApiKeyPayload, type, env)
		} else if (table === 'projects') {
			await handleProjectChange(payload as ProjectPayload, type, env)
		} else {
			logger.warn('Unknown table in webhook', { table })
		}

		logger.info('Successfully processed webhook event', { table, type })
		return Response.json({ success: true })
	} catch (error) {
		logger.error('Webhook processing failed', error, { table, type })
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
	const keyHashPreview = apiKey.key_hash.substring(0, 8)

	const apiKeyLogger = logger.child({ handler: 'apiKey', keyHashPreview, type })
	apiKeyLogger.info('Processing API key change')

	if (type === 'DELETE') {
		// Remove from cache if deleted or revoked
		await env.PROJECT_SETTINGS.delete(cacheKey)
		apiKeyLogger.info('Deleted API key from cache', {
			reason: type === 'DELETE' ? 'deleted' : 'revoked'
		})
	} else {
		// Update cache with fresh data
		await env.PROJECT_SETTINGS.put(cacheKey, JSON.stringify(apiKey))
		apiKeyLogger.info('Updated API key cache')
	}
}

async function handleProjectChange(
	payload: ProjectPayload,
	type: 'DELETE' | 'INSERT' | 'UPDATE',
	env: Env
): Promise<void> {
	const project = type === 'DELETE' ? payload.old_record : payload.record
	const cacheKey = `project:${project.id}`

	const projectLogger = logger.child({ handler: 'project', projectId: project.id, type })
	projectLogger.info('Processing project change', { payload: project })

	if (type === 'DELETE') {
		// Remove from cache if deleted
		await env.PROJECT_SETTINGS.delete(cacheKey)
		projectLogger.info('Deleted project from cache')
	} else {
		// Fetch full project data with subscriptions
		projectLogger.info('Fetching full project data')
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
			projectLogger.error('Failed to fetch project data', error)
			return
		}

		projectLogger.info('Successfully fetched project data', { data })

		const settings = data.settings as null | ProjectSettings
		const subscription = data.subscription?.[0]
		const entitlement = data.entitlement?.[0]

		projectLogger.info('Building project settings cache', {
			hasEntitlement: !!entitlement,
			hasSubscription: !!subscription
		})

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
						billingCycle: subscription.interval,
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
		projectLogger.info('Successfully updated project cache')
	}
}
