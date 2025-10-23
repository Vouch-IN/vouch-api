import { type MXResponse } from '../../types'
import { withTimeout } from '../../utils'

export async function checkMXRecords(email: string, domainPart: string, env: Env): Promise<boolean | null> {
	const cacheKey = `mx:${domainPart}`
	let hasMX: boolean | null = null
	const cached = await withTimeout(env.MX_CACHE.get<{ hasMX: boolean }>(cacheKey, { type: 'json' }), 100)
	if (cached && typeof cached.hasMX === 'boolean') {
		hasMX = cached.hasMX
	} else {
		const r = await withTimeout(fetch(`https://dns.google/resolve?name=${encodeURIComponent(domainPart)}&type=MX`), 600)
		if (r.ok) {
			const data: MXResponse = await r.json()
			// TODO: Check MX records status
			hasMX = Array.isArray(data.Answer) && data.Answer.length > 0
			// Cache result for 1 day
			env.MX_CACHE.put(cacheKey, JSON.stringify({ hasMX }), { expirationTtl: 86400 }).catch((error: unknown) => {
				console.error('Error caching mx records', error)
			})
		} else {
			hasMX = null
		}
	}
	return hasMX
}
