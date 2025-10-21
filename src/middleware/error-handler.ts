import { errorResponse } from '../utils'

/**
 * Global error handler middleware – logs the error and returns internal server error response
 */
export function handleError(error: unknown): Response {
	console.error('Request error:', error)

	const message: string = error instanceof Error ? error.message : 'An unexpected error occurred'

	return errorResponse('internal_error', message, 500)
}
