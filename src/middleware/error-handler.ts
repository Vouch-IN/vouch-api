import { createLogger, errorResponse } from '../utils'

const logger = createLogger({ middleware: 'errorHandler' })

/**
 * Global error handler middleware – logs the error and returns internal server error response
 */
export function handleError(error: unknown): Response {
	const message: string = error instanceof Error ? error.message : 'An unexpected error occurred'

	logger.error('Request error', error, { message })

	return errorResponse('internal_error', message, 500)
}
