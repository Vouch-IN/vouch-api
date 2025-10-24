import {
	errorResponse,
	fetchCachedApiKey,
	getApiKeyFromRequest,
	sha256Hex,
	validateOrigin
} from '../utils'

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
 * Requires the request and environment for fetching KV cached keys
 */
export async function handleCors(request: Request, env: Env): Promise<Response> {
	// Validate origin based on API key from headers
	const apiKey = getApiKeyFromRequest(request)
	if (!apiKey) {
		return errorResponse('unauthorized', 'Missing Authorization header', 401)
	}

	const keyHash = await sha256Hex(apiKey)

	const apiKeyData = await fetchCachedApiKey(keyHash, env)
	if (!apiKeyData) {
		return errorResponse('unauthorized', 'Invalid API key', 401)
	}

	const originValidation = validateOrigin(request, apiKeyData)

	if (!originValidation.valid || !originValidation.origin) {
		return errorResponse('not_allowed', 'Origin not allowed', 403)
	}

	return new Response(null, {
		headers: corsHeaders(originValidation.origin),
		status: 204
	})
}
