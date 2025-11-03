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
 * Detect if User-Agent is from a browser or mobile app
 */
export function isBrowserUserAgent(userAgent: string): boolean {
	const browserPatterns = [
		/Mozilla/i,
		/Chrome/i,
		/Safari/i,
		/Firefox/i,
		/Edge/i,
		/Opera/i,
		/MSIE/i,
		/Trident/i, // IE
		/iPhone/i,
		/iPad/i,
		/Android/i,
		/Mobile/i
	]

	return browserPatterns.some((pattern) => pattern.test(userAgent))
}

/**
 * Check if a domain matches an allowed domain pattern
 * Supports:
 * - "*" (wildcard for all domains)
 * - "*.example.com" (wildcard for all subdomains)
 * - "example.com" (exact match)
 */
function matchesDomainPattern(requestDomain: string, allowedPattern: string): boolean {
	// "*" allows all domains
	if (allowedPattern === '*') {
		return true
	}

	// Exact match
	if (allowedPattern === requestDomain) {
		return true
	}

	// Wildcard subdomain pattern (*.example.com)
	if (allowedPattern.startsWith('*.')) {
		const baseDomain = allowedPattern.slice(2) // Remove "*."
		
		// Check if request domain ends with the base domain
		// and has a subdomain prefix (not the base domain itself)
		if (requestDomain.endsWith(`.${baseDomain}`)) {
			return true
		}
		
		// Also match the base domain without subdomain if specified
		// Uncomment below if you want "*.example.com" to also match "example.com"
		if (requestDomain === baseDomain) {
			return true
		}
	}

	return false
}

/**
 * Validate origin against allowed domains in apiKey
 */
export function validateOrigin(
	request: Request,
	apiKey: ApiKey
): { error?: string; origin?: null | string; valid: boolean } {
	const origin = request.headers.get('Origin') ?? request.headers.get('Referer')

	// Server keys bypass origin validation
	if (apiKey.type === 'server') {
		return { origin, valid: true }
	}

	// For client keys, origin must exist
	if (!origin) {
		return { error: 'Origin header required for client keys', valid: false }
	}

	const allowedDomains = apiKey.allowed_domains

	if (!allowedDomains || allowedDomains.length === 0) {
		return { error: 'No allowed domains configured for this API key', valid: false }
	}

	let requestDomain: string
	try {
		requestDomain = new URL(origin).hostname
	} catch {
		return { error: 'Invalid origin URL format', valid: false }
	}

	// Check if request domain matches any allowed pattern
	const isAllowed = allowedDomains.some((pattern: string) => matchesDomainPattern(requestDomain, pattern))

	if (!isAllowed) {
		return { 
			error: `Domain '${requestDomain}' is not whitelisted for this API key`, 
			valid: false 
		}
	}

	return { origin, valid: true }
}
