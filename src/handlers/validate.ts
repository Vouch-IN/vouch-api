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

export async function handleValidation(request: Request, env: Env): Promise<Response> {
	const startedAt = performance.now()

	try {
		if (request.method === 'OPTIONS') {
			return await handleCors(request, env)
		}

		if (request.method !== 'POST') {
			logger.warn('Invalid method used', { method: request.method })
			return errorResponse('method_not_allowed', 'Only POST is allowed', 405)
		}

		// 1. Authenticate request
		const auth = await authenticate(request, env)
		if (!auth.success || !auth.apiKey || !auth.projectId) {
			return errorResponse('unauthorized', auth.error ?? 'Unauthorized', 401)
		}

		// Create request-scoped logger with context
		const requestLogger = logger.child({
			keyId: auth.apiKey.id,
			keyType: auth.apiKey.type,
			projectId: auth.projectId
		})

		// 2. Check rate limit based on key type
		const rate = await checkRateLimit(
			auth.projectId,
			auth.apiKey.type === 'client' ? 'client' : 'server',
			env
		)
		const rateLimitHeaders = {
			'X-RateLimit-Limit': rate.limit.toString(),
			'X-RateLimit-Remaining': rate.remaining.toString(),
			'X-RateLimit-Reset': rate.resetAt.toString()
		}

		if (!rate.allowed) {
			requestLogger.warn('Rate limit exceeded')
			return errorResponse('rate_limited', 'Rate limit exceeded', 429, rateLimitHeaders)
		}

		// 3. Parse request body
		const body: undefined | ValidationRequest = await request.json()

		if (!body?.email || typeof body.email !== 'string') {
			requestLogger.warn('Invalid request body', { hasEmail: !!body?.email })
			return errorResponse('invalid_request', 'Missing or invalid email', 422)
		}

		// 4. Get project settings (from cache)
		const projectSettings = await getCachedData<ProjectSettings>(`project:${auth.projectId}`, env)

		// 5. Check usage quota
		const usageCheck = await checkUsageQuota(auth.projectId, projectSettings?.entitlements, env)
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

		// 6. Determine which validations to run (merge project defaults with request overrides)
		const enabledValidations = {
			...DEFAULT_VALIDATIONS,
			...projectSettings?.validations,
			...body.validations
		}

		// 7. Load thresholds for risk scoring (merge project defaults with settings)
		const thresholds = { ...DEFAULT_THRESHOLDS, ...projectSettings?.thresholds }

		// 8. Load risk weights for scoring signals (merge project defaults with settings)
		const riskWeights = { ...DEFAULT_RISK_WEIGHTS, ...projectSettings?.riskWeights }

		// 9. Extract email from request body, fallback to null if not present
		const email = body.email.toLowerCase()

		// 10. Extract fingerprint hash from request body, fallback to null if not present
		const fingerprintHash = body.fingerprint?.hash ?? null

		// 11. Get the client IP from headers, check both Cloudflare and forwarded headers
		const ip = request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')

		// 12. Get ASN (Autonomous System Number) from Cloudflare request object if available
		const asn = request.cf?.asn

		// 13. Run all enabled validations and get results including checks, previous signups and risk signals
		const validationResults = await runValidations(
			auth.projectId,
			email,
			enabledValidations,
			fingerprintHash,
			ip,
			asn,
			env
		)

		// 14. Check whitelist/blacklist overrides
		const finalResults = applyOverrides(
			validationResults,
			email,
			projectSettings?.whitelist ?? [],
			projectSettings?.blacklist ?? []
		)

		// 15. Calculate overall risk score based on signals and configured risk weights
		const riskScore = calculateRiskScore(finalResults.signals, riskWeights)

		// 16. Determine recommendation based on risk score and threshold settings
		const recommendation = determineRecommendation(riskScore, thresholds)

		// 17. Determine if email is valid based on risk score threshold and syntax check
		const isValid = riskScore < thresholds.flag && !finalResults.signals.includes('invalid_syntax')

		// Log only problematic validations (blocked or flagged)
		if (recommendation === 'block' || recommendation === 'flag') {
			requestLogger.warn('Validation blocked/flagged', {
				recommendation,
				riskScore,
				signals: finalResults.signals
			})
		}

		// 18. Increment usage counter (Durable Object)
		await incrementUsage(auth.projectId, env)

		// 19. Calculate total processing time for the request
		// TODO: Move this to async process to reduce latency
		const totalLatency = performance.now() - startedAt

		// 20. Record validation log (async, non-blocking)
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

		// 21. Record metrics (Prometheus)
		recordMetric(env, 'vouch_validations_total', 1, {
			project_id: auth.projectId,
			result: recommendation
		})
		recordMetric(env, 'vouch_validation_duration_ms', totalLatency, {
			project_id: auth.projectId
		})

		// 22. Update API key last_used_at (async, non-blocking)
		updateApiKeyLastUsed(auth.apiKey.id, env).catch((error: unknown) => {
			requestLogger.error('Failed to update API key last_used_at', error)
		})

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
		recordMetric(env, 'vouch_errors_total', 1, {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			error_type: error.name ?? 'unknown'
		})
		return handleError(error)
	}
}
