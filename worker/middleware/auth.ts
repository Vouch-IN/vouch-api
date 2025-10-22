import type { AuthResult } from '../types'
import { fetchCachedApiKey, getApiKeyFromRequest, isApiKeyFormatValid, sha256Hex, validateOrigin } from '../utils'

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
