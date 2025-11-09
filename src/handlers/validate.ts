import { DEFAULT_RISK_WEIGHTS, DEFAULT_THRESHOLDS, DEFAULT_VALIDATIONS } from '../constants'
import {
	addCorsHeaders,
	authenticate,
	checkRateLimit,
	handleCors,
	handleError
} from '../middleware'
import { recordValidationLog } from '../services/logging'
import { recordMetric } from '../services/metrics'
import { checkUsageQuota, incrementUsage, updateApiKeyLastUsed } from '../services/project'
import { calculateRiskScore, determineRecommendation } from '../services/risk'
import { applyOverrides, runValidations } from '../services/validation'
import { type ProjectSettings, type ValidationRequest, type ValidationResponse } from '../types'
import { createLogger, errorResponse, getCachedData, jsonResponse, validateOrigin } from '../utils'

const logger = createLogger({ handler: 'validate' })

export async function handleValidation(
	request: Request,
	env: Env,
	ctx: ExecutionContext
): Promise<Response> {
	const startedAt = performance.now()

	try {
		if (request.method === 'OPTIONS') {
			return await handleCors(request)
		}

		if (request.method !== 'POST') {
			logger.warn('Invalid method used', { method: request.method })
			return errorResponse('method_not_allowed', 'Only POST is allowed', 405)
		}

		// Parse request body
		const body: undefined | ValidationRequest = await request.json()

		if (!body?.email || typeof body.email !== 'string') {
			logger.warn('Invalid request body', { hasEmail: !!body?.email })
			return errorResponse('invalid_request', 'Missing or invalid email', 422)
		}

		// Extract project id from the request headers
		const projectId = request.headers.get('x-project-id')

		if (!projectId || typeof projectId !== 'string') {
			logger.warn('Invalid request body', { hasProjectId: !!projectId })
			return errorResponse('invalid_request', 'Missing or invalid project id', 422)
		}

		// Authenticate request and Get project settings (from cache)
		const [auth, projectSettings] = await Promise.all([
			authenticate(request, env),
			getCachedData<ProjectSettings>(`project:${projectId}`, env)
		])

		if (!auth.success || !auth.apiKey || !auth.projectId) {
			requestLogger.warn(auth.error ?? 'Unauthorized')
			return errorResponse('unauthorized', auth.error ?? 'Unauthorized', 401)
		}

		if (auth.projectId !== projectSettings.projectId) {
			requestLogger.warn('Invalid Project Id')
			return errorResponse('unauthorized', 'Invalid Project Id', 401)
		}

		// Create request-scoped logger with context
		const requestLogger = logger.child({
			keyId: auth.apiKey.id,
			keyType: auth.apiKey.type,
			projectId: auth.projectId
		})

		// Check rate limit based on key type and Check usage quota
		const [rate, usageCheck] = await Promise.all([
			checkRateLimit(auth.projectId, auth.apiKey.type === 'client' ? 'client' : 'server', env),
			checkUsageQuota(auth.projectId, projectSettings?.entitlements, env)
		])

		const rateLimitHeaders = {
			'X-RateLimit-Limit': rate.limit.toString(),
			'X-RateLimit-Remaining': rate.remaining.toString(),
			'X-RateLimit-Reset': rate.resetAt.toString()
		}

		if (!rate.allowed) {
			requestLogger.warn('Rate limit exceeded')
			return errorResponse('rate_limited', 'Rate limit exceeded', 429, rateLimitHeaders)
		}

		if (!usageCheck.allowed) {
			requestLogger.warn('Usage quota exceeded', {
				current: usageCheck.current,
				limit: usageCheck.limit
			})
			return errorResponse(
				'quota_exceeded',
				`You've used ${usageCheck.current} of ${usageCheck.limit} validations this month`,
				402,
				rateLimitHeaders
			)
		}

		// 7. Determine which validations to run (merge project defaults with request overrides)
		const enabledValidations = {
			...DEFAULT_VALIDATIONS,
			...projectSettings?.validations,
			...body.validations
		}

		// 8. Load thresholds for risk scoring (merge project defaults with settings)
		const thresholds = { ...DEFAULT_THRESHOLDS, ...projectSettings?.thresholds }

		// 9. Load risk weights for scoring signals (merge project defaults with settings)
		const riskWeights = { ...DEFAULT_RISK_WEIGHTS, ...projectSettings?.riskWeights }

		// 10. Extract email from request body, fallback to null if not present
		const email = body.email.toLowerCase()

		// 11. Extract fingerprint hash from request body, fallback to null if not present
		const fingerprintHash = body.fingerprint?.hash ?? null

		// 12. Get the client IP from headers, check both Cloudflare and forwarded headers
		const ip = request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')

		// 13. Get ASN (Autonomous System Number) from Cloudflare request object if available
		const asn = request.cf?.asn

		// 14. Run all enabled validations and get results including checks, previous signups and risk signals
		const validationResults = await runValidations(
			auth.projectId,
			email,
			enabledValidations,
			fingerprintHash,
			ip,
			asn,
			env,
			auth.apiKey.type
		)

		// 15. Check whitelist/blacklist overrides
		const finalResults = applyOverrides(
			validationResults,
			email,
			projectSettings?.whitelist ?? [],
			projectSettings?.blacklist ?? []
		)

		// 16. Calculate overall risk score based on signals and configured risk weights
		const riskScore = calculateRiskScore(finalResults.signals, riskWeights)

		// 17. Determine recommendation based on risk score and threshold settings
		const recommendation = determineRecommendation(riskScore, thresholds)

		// 18. Determine if email is valid based on risk score threshold and syntax check
		const isValid = riskScore < thresholds.flag && !finalResults.signals.includes('invalid_syntax')

		// Log only problematic validations (blocked or flagged)
		if (recommendation === 'block' || recommendation === 'flag') {
			requestLogger.warn('Validation blocked/flagged', {
				recommendation,
				riskScore,
				signals: finalResults.signals
			})
		}

		// 19. Increment usage counter (Durable Object)
		ctx.waitUntil(incrementUsage(auth.projectId, env))

		// 20. Calculate total processing time for the request
		const totalLatency = performance.now() - startedAt

		// 21. Record validation log (async, non-blocking)
		ctx.waitUntil(
			recordValidationLog(
				auth.projectId,
				email,
				finalResults,
				fingerprintHash,
				ip,
				riskScore,
				recommendation,
				totalLatency,
				isValid,
				env
			).catch((error: unknown) => {
				requestLogger.error('Failed to log validation', error)
			})
		)

		// 22. Record metrics (Prometheus)
		ctx.waitUntil(
			recordMetric(env, 'vouch_validations_total', 1, {
				project_id: auth.projectId,
				result: recommendation
			})
		)
		ctx.waitUntil(
			recordMetric(env, 'vouch_validation_duration_ms', totalLatency, {
				project_id: auth.projectId
			})
		)

		// 23. Update API key last_used_at (async, non-blocking)
		ctx.waitUntil(
			updateApiKeyLastUsed(auth.apiKey.id, env).catch((error: unknown) => {
				requestLogger.error('Failed to update API key last_used_at', error)
			})
		)

		const response: ValidationResponse = {
			checks: finalResults.checks,
			isValid,
			metadata: {
				fingerprintId: fingerprintHash,
				previousSignups: finalResults.deviceData?.previousSignups ?? 0,
				totalLatency
			},
			recommendation,
			riskScore,
			signals: finalResults.signals
		}

		let resp = jsonResponse(response, 200, rateLimitHeaders)

		// Add CORS headers if client key and origin present
		const originRes = validateOrigin(request, auth.apiKey)
		if (originRes.valid && originRes.origin) {
			resp = addCorsHeaders(resp, originRes.origin)
		}

		return resp
	} catch (error: unknown) {
		ctx.waitUntil(
			recordMetric(env, 'vouch_errors_total', 1, {
				error_type: error.name ?? 'unknown'
			})
		)
		return handleError(error)
	}
}
