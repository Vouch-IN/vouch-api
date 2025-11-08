import { CLIENT_RATE_LIMIT, SERVER_RATE_LIMIT, WINDOW_MS } from '../constants'
import type { RateLimitResult } from '../types'
import { createLogger } from '../utils'

const logger = createLogger({ middleware: 'rateLimit' })

export async function checkRateLimit(
	projectId: string,
	keyType: 'client' | 'server',
	env: Env
): Promise<RateLimitResult> {
	const now = Date.now()
	const windowKey = `ratelimit:${projectId}:${Math.floor(now / WINDOW_MS)}`

	const currentCountStr = await env.RATE_LIMITS.get(windowKey)
	const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0

	const limit = keyType === 'client' ? CLIENT_RATE_LIMIT : SERVER_RATE_LIMIT

	if (currentCount >= limit) {
		logger.warn('Rate limit exceeded', { projectId, keyType, currentCount, limit })
		return {
			allowed: false,
			limit,
			remaining: 0,
			resetAt: Math.floor(((Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS) / 1000)
		}
	}

	await env.RATE_LIMITS.put(windowKey, (currentCount + 1).toString(), {
		expirationTtl: Math.ceil(WINDOW_MS / 1000) + 60
	})

	logger.debug('Rate limit check passed', {
		projectId,
		keyType,
		currentCount: currentCount + 1,
		limit,
		remaining: Math.max(limit - currentCount - 1, 0)
	})

	return {
		allowed: true,
		limit,
		remaining: Math.max(limit - currentCount - 1, 0),
		resetAt: Math.floor(((Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS) / 1000)
	}
}
