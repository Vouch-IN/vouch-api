import { type MXResponse } from '../types'
import { jsonResponse } from '../utils'

export async function handleHealth(_request: Request, env: Env): Promise<Response> {
	const started = Date.now()

	// Helper to run a check with timeout and degraded threshold
	async function runCheck(test: () => Promise<boolean>, timeoutMs: number, degradedAt: number) {
		const t0 = Date.now()
		let status: 'degraded' | 'down' | 'operational' = 'operational'
		let latency = 0
		try {
			const ok = await Promise.race([
				test(),
				new Promise<boolean>((_, reject) =>
					setTimeout(() => {
						reject(new Error('timeout'))
					}, timeoutMs)
				)
			])
			latency = Date.now() - t0
			if (!ok) status = 'down'
			else if (latency > degradedAt) status = 'degraded'
		} catch {
			status = 'down'
			latency = Date.now() - t0
		}
		return { latency, status }
	}

	// Define tests
	const tests: Record<string, { degradedAt: number; fn: () => Promise<boolean>; timeout: number }> = {
		dns: {
			degradedAt: 200,
			fn: async () => {
				try {
					const r = await fetch('https://dns.google/resolve?name=gmail.com&type=MX')
					if (!r.ok) return false
					const data: MXResponse = await r.json()
					return Array.isArray(data.Answer) && data.Answer.length > 0
				} catch {
					return false
				}
			},
			timeout: 500
		},
		durableObjects: {
			degradedAt: 300,
			fn: async () => {
				try {
					const id = env.FINGERPRINTS.idFromName('health-check')
					const stub = env.FINGERPRINTS.get(id)

					await stub.checkFingerprintAndRecordSignup({
						email: 'health@example.com',
						fingerprintHash: 'health-check',
						ip: null,
						projectId: 'health'
					})

					return true
				} catch {
					return false
				}
			},
			timeout: 500
		},
		kv: {
			degradedAt: 50,
			fn: async () => {
				try {
					// Small metadata fetch rather than full list
					const meta = await env.DISPOSABLE_DOMAINS.get('domains:metadata')
					return meta !== null
				} catch {
					return false
				}
			},
			timeout: 100
		},
		supabase: {
			degradedAt: 500,
			fn: async () => {
				try {
					// Lightweight reachability; writing is handled by background workers elsewhere
					const r = await fetch(`${env.SUPABASE_URL}/rest/v1/`, { headers: { apikey: env.SUPABASE_KEY } })
					return r.ok
				} catch {
					return false
				}
			},
			timeout: 1000
		},
		workers: {
			degradedAt: 100,
			// If we reached here, Workers can execute. Evaluate performance against threshold.
			fn: async () => Promise.resolve(true),
			timeout: 200
		}
	}

	const entries = Object.entries(tests)
	const settled = await Promise.all(
		entries.map(async ([name, def]) => [name, await runCheck(def.fn, def.timeout, def.degradedAt)] as const)
	)
	const components = Object.fromEntries(settled.map(([name, res]) => [name, res])) as Record<
		string,
		{ latency: number; status: 'degraded' | 'down' | 'operational' }
	>

	// Compute overall status per rules
	const coreNames = new Set(['durableObjects', 'kv', 'workers'])
	let overall: 'degraded' | 'down' | 'operational' = 'operational'
	const anyDown = Object.values(components).some((c) => c.status === 'down')
	const anyCoreDown = Object.entries(components).some(([name, c]) => coreNames.has(name) && c.status === 'down')
	const anyDegraded = Object.values(components).some((c) => c.status === 'degraded')
	if (anyCoreDown) overall = 'down'
	else if (anyDown)
		overall = 'degraded' // non-core down -> degraded
	else if (anyDegraded) overall = 'degraded'

	const response = {
		components,
		latency: Date.now() - started,
		status: overall,
		timestamp: new Date().toISOString()
	}
	return jsonResponse(response)
}
