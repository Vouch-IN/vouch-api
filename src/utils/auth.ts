import type { ApiKey } from '../types'

import { getCachedData } from './cache'

/**
 * Fetch cached API key data from KV, fallback to null
 */
export async function fetchCachedApiKey(keyHash: string, env: Env): Promise<ApiKey | null> {
	const cacheKey = `apikey:${keyHash}`
	return getCachedData<ApiKey>(cacheKey, env)
}

/**
 * Extract API key string (without "Bearer ") from headers
 */
export function getApiKeyFromRequest(request: Request): null | string {
	const authHeader = request.headers.get('Authorization')
	if (!authHeader?.startsWith('Bearer ')) return null
	return authHeader.substring(7)
}

/**
 * Validate API key basic format
 */
export function isApiKeyFormatValid(apiKey: string): boolean {
	const regex = /^(pk|sk)_(test|live)_[a-zA-Z0-9]{32,}$/
	return regex.test(apiKey)
}

/**
 * Validate origin against allowed domains in apiKey
 */
export function validateOrigin(
	request: Request,
	apiKey: ApiKey
): { error?: string; origin?: null | string; valid: boolean } {
	const origin = request.headers.get('Origin') ?? request.headers.get('Referer')

	if (apiKey.type === 'server') {
		return { origin, valid: true }
	}

	// For client keys, origin must exist and be whitelisted
	if (!origin) {
		return { error: 'Origin header required for client keys', valid: false }
	}

	const allowedDomains = apiKey.allowed_domains

	if (!allowedDomains || allowedDomains.length === 0) {
		return { error: 'No allowed domains configured for this API key', valid: false }
	}

	const requestDomain = new URL(origin).hostname

	if (!allowedDomains.includes(requestDomain)) {
		return { error: 'Domain not whitelisted for this API key', valid: false }
	}

	return { origin, valid: true }
}
