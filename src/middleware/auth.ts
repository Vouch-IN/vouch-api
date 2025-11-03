import type { AuthResult } from '../types'
import {
	fetchCachedApiKey,
	getApiKeyFromRequest,
	isApiKeyFormatValid,
	isBrowserUserAgent,
	sha256Hex,
	validateOrigin
} from '../utils'

export async function authenticate(request: Request, env: Env): Promise<AuthResult> {
	const apiKeyStr = getApiKeyFromRequest(request)

	if (!apiKeyStr || !isApiKeyFormatValid(apiKeyStr)) {
		return { error: 'Missing or invalid Authorization header', success: false }
	}

	const keyHash = await sha256Hex(apiKeyStr)
	const apiKey = await fetchCachedApiKey(keyHash, env)

	if (!apiKey) {
		return { error: 'Invalid API key', success: false }
	}

	if (apiKey.revoked_at) {
		return { error: 'API key has been revoked', success: false }
	}

	if (!apiKey.project_id) {
		return { error: 'Invalid API key: missing project ID', success: false }
	}

	// Security check: Server keys should not be used from client-facing applications
	if (apiKey.type === 'server') {
		const origin = request.headers.get('Origin')
		const referer = request.headers.get('Referer')
		const userAgent = request.headers.get('User-Agent')

		// If request has Origin or Referer header, it's from a browser/client app
		if (origin || referer) {
			return {
				error:
					'Server API keys cannot be used from browsers or mobile apps. Use client API keys instead. Server keys should only be used from backend servers.',
				success: false
			}
		}

		// Additional check for common browser User-Agent patterns
		if (userAgent && isBrowserUserAgent(userAgent)) {
			return {
				error:
					'Server API keys detected in browser environment. This is a security risk. Use client API keys for frontend applications.',
				success: false
			}
		}
	}

	const originValidation = validateOrigin(request, apiKey)

	if (!originValidation.valid) {
		return { error: originValidation.error ?? 'Origin validation failed', success: false }
	}

	return {
		apiKey,
		projectId: apiKey.project_id,
		success: true
	}
}
