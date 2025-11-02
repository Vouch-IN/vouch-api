import { corsHeaders } from './cors.ts'

/**
 * Custom error classes for better error handling
 */
export class ValidationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'ValidationError'
	}
}

export class AuthenticationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'AuthenticationError'
	}
}

export class AuthorizationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'AuthorizationError'
	}
}

export class NotFoundError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'NotFoundError'
	}
}

export class StripeError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'StripeError'
	}
}

/**
 * Standard error response
 */
export function errorResponse(message: string, status: number = 400) {
	return new Response(
		JSON.stringify({
			error: message
		}),
		{
			headers: corsHeaders,
			status
		}
	)
}

/**
 * Success response
 */
export function successResponse(data: any, status: number = 200) {
	return new Response(JSON.stringify(data), {
		headers: corsHeaders,
		status
	})
}

/**
 * Centralized error handler
 * Maps error types to appropriate HTTP status codes
 */
export function handleError(error: any) {
	console.error('❌ Error:', error)

	// Handle custom error classes
	if (error instanceof ValidationError || error instanceof StripeError) {
		return errorResponse(error.message, 400)
	}
	if (error instanceof AuthenticationError) {
		return errorResponse(error.message, 401)
	}
	if (error instanceof AuthorizationError) {
		return errorResponse(error.message, 403)
	}
	if (error instanceof NotFoundError) {
		return errorResponse(error.message, 404)
	}

	// Handle string-based error detection (for compatibility)
	if (error.message?.includes('Missing authorization')) {
		return errorResponse(error.message, 401)
	}
	if (error.message?.includes('Unauthorized')) {
		return errorResponse('Unauthorized', 401)
	}
	if (error.message?.includes('Access denied') || error.message?.includes('Forbidden')) {
		return errorResponse(error.message, 403)
	}
	if (error.message?.includes('not found')) {
		return errorResponse(error.message, 404)
	}
	if (error.message?.includes('already exists') || error.message?.includes('limit reached')) {
		return errorResponse(error.message, 400)
	}

	// Generic server error
	return errorResponse(error.message || 'Internal server error', 500)
}
