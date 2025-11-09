import { createLogger, errorResponse } from '../utils'

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
 * Just returns CORS headers - actual auth happens on the real request
 */
export function handleCors(request: Request): Promise<Response> {
	const origin = request.headers.get('Origin')

	if (!origin) {
		logger.warn('CORS preflight without Origin header')
		return errorResponse('bad_request', 'Missing Origin header', 400)
	}

	// Allow preflight - validation happens on actual request
	return new Response(null, {
		headers: corsHeaders(origin),
		status: 204
	})
}
