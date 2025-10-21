import type { Tables } from './database.types'

export type ApiKey = Tables<'api_keys'>

export type AuthResult = {
	apiKey?: ApiKey
	error?: string
	projectId?: string
	success: boolean
}

export type RateLimitResult = {
	allowed: boolean
	limit: number
	remaining: number
	resetAt: number
}
