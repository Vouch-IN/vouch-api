export type ErrorResponse = {
	error: string
	message: string
}

/**
 * Create a typed, JSON error response with optional headers and status code
 */
export function errorResponse(errorType: string, message: string, status = 400, headers?: Record<string, string>): Response {
	return jsonResponse(
		{
			error: errorType,
			message
		} satisfies ErrorResponse,
		status,
		headers
	)
}

export function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
	return new Response(JSON.stringify(data), {
		headers: {
			'Content-Type': 'application/json',
			...(headers ?? {})
		},
		status
	})
}
