import {
	createLogger,
	errorResponse,
	fetchCachedApiKey,
	getApiKeyFromRequest,
	sha256Hex,
	validateOrigin
} from '../utils'

const logger = createLogger({ middleware: 'cors' })

/**
 * Add CORS headers to actual responses
 */
export function addCorsHeaders(response: Response, origin: string): Response {
	const newResponse = new Response(response.body, response)

	const headers = corsHeaders(origin)
	for (const [key, value] of Object.entries(headers)) {
		newResponse.headers.set(key, value)
	}

	return newResponse
}

/**
 * Generate CORS headers for a given valid origin
 */
export function corsHeaders(origin: string): Record<string, string> {
	return {
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Max-Age': '86400'
	}
}

/**
 * Handle CORS preflight OPTIONS requests
 * Supports API key via query param for origin validation during preflight
 */
export async function handleCors(request: Request, env: Env): Promise<Response> {
	const origin = request.headers.get('Origin')

	if (!origin) {
		logger.warn('CORS preflight without Origin header')
		return errorResponse('bad_request', 'Missing Origin header', 400)
	}

	// Try to get API key from query param (recommended for preflight)
	const url = new URL(request.url)
	const apiKeyFromQuery = url.searchParams.get('key')

	if (apiKeyFromQuery) {
		// Validate API key and origin during preflight
		const keyHash = await sha256Hex(apiKeyFromQuery)
		const apiKeyData = await fetchCachedApiKey(keyHash, env)

		if (!apiKeyData) {
			logger.warn('CORS preflight with invalid API key', {
				keyHashPreview: keyHash.substring(0, 8),
				origin
			})
			return errorResponse('unauthorized', 'Invalid API key', 401)
		}

		const originValidation = validateOrigin(request, apiKeyData)

		if (!originValidation.valid || !originValidation.origin) {
			logger.warn('CORS origin not allowed', {
				allowedDomains: apiKeyData.allowed_domains,
				keyId: apiKeyData.id,
				origin,
				reason: originValidation.error
			})
			return errorResponse('forbidden', 'Origin not allowed for this API key', 403)
		}

		// Origin validated - return CORS headers
		return new Response(null, {
			headers: corsHeaders(originValidation.origin),
			status: 204
		})
	}

	// Fallback: No API key provided in query param
	// Check if Authorization header will be sent in actual request
	const requestedHeaders = request.headers.get('Access-Control-Request-Headers')
	const willSendAuth = requestedHeaders?.toLowerCase().includes('authorization')

	if (!willSendAuth) {
		logger.warn('CORS preflight without Authorization', { origin })
		return errorResponse('unauthorized', 'Authorization required', 401)
	}

	// Allow preflight - actual request will validate API key + origin
	return new Response(null, {
		headers: corsHeaders(origin),
		status: 204
	})
}
