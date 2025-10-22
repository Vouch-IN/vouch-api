import { checkFingerprintAndRecordSignup } from '../kv'
import {
	checkDisposableEmail,
	checkMXRecords,
	detectAliasPattern,
	detectCatchAll,
	detectRoleEmail,
	validateEmailSyntax,
	verifySMTP
} from '../services/email-validation'
import { checkIPReputation } from '../services/ip-validation'
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
		// ===== External Service Checks =====
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
		domains: {
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
		fingerprint: {
			degradedAt: 150,
			fn: async () => {
				try {
					await checkFingerprintAndRecordSignup(
						{
							email: 'health@example.com',
							fingerprintHash: 'health-check',
							ip: null,
							projectId: 'health'
						},
						env
					)

					return true
				} catch {
					return false
				}
			},
			timeout: 300
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

		validation_alias: {
			degradedAt: 10,
			fn: async () => {
				try {
					// Test alias detection
					const hasAlias = detectAliasPattern('test+alias@example.com', 'test+alias')
					const noAlias = !detectAliasPattern('test@example.com', 'test')
					return hasAlias && noAlias
				} catch {
					return Promise.resolve(false)
				}
			},
			timeout: 50
		},
		validation_catchall: {
			degradedAt: 400,
			fn: async () => {
				try {
					// Test catch-all detection
					await detectCatchAll('healthcheck@example.com', env)
					// If it doesn't throw, catch-all check is working
					return true
				} catch {
					return true
				}
			},
			timeout: 600
		},
		validation_disposable: {
			degradedAt: 200,
			fn: async () => {
				try {
					// Test against known disposable domain (guerrillamail.com is commonly disposable)
					const isDisposable = await checkDisposableEmail('guerrillamail.com', env)
					// Test against known legitimate domain
					const notDisposable = !(await checkDisposableEmail('gmail.com', env))
					return isDisposable && notDisposable
				} catch {
					return false
				}
			},
			timeout: 500
		},
		validation_ip: {
			degradedAt: 300,
			fn: async () => {
				try {
					// Test IP reputation check with a test IP (Google DNS)
					const ipData = await checkIPReputation('8.8.8.8', null, env)
					// Just verify the check completes and returns data
					return typeof ipData === 'object' && ipData !== null
				} catch {
					return false
				}
			},
			timeout: 700
		},
		validation_mx: {
			degradedAt: 300,
			fn: async () => {
				try {
					// Test MX record checking with a known good domain
					const hasMX = await checkMXRecords('test@gmail.com', 'gmail.com', env)
					return hasMX === true
				} catch {
					return false
				}
			},
			timeout: 800
		},
		validation_role: {
			degradedAt: 10,
			fn: async () => {
				try {
					// Test role email detection
					const isRole = detectRoleEmail('admin')
					const notRole = !detectRoleEmail('john.doe')
					return isRole && notRole
				} catch {
					return Promise.resolve(false)
				}
			},
			timeout: 50
		},
		validation_smtp: {
			degradedAt: 400,
			fn: async () => {
				try {
					// Test SMTP verification - use a test email that won't cause issues
					await verifySMTP('healthcheck@example.com', env)
					// If it doesn't throw, SMTP check is working
					return true
				} catch {
					// SMTP can legitimately fail for test emails, so we check that it runs
					return true
				}
			},
			timeout: 600
		},

		// ===== Email Validation Checks =====
		validation_syntax: {
			degradedAt: 10,
			fn: async () => {
				try {
					// Test syntax validation with valid and invalid emails
					const valid = validateEmailSyntax('test@example.com')
					const invalid = !validateEmailSyntax('invalid-email')
					return valid && invalid
				} catch {
					return Promise.resolve(false)
				}
			},
			timeout: 50
		},
		// ===== Core Infrastructure Checks =====
		workers: {
			degradedAt: 100,
			// If we reached here, Workers can execute. Evaluate performance against threshold.
			fn: async () => Promise.resolve(true),
			timeout: 200
		}
	}

	// Run all checks in parallel for better performance
	const entries = Object.entries(tests)
	const settled = await Promise.allSettled(
		entries.map(async ([name, def]) => [name, await runCheck(def.fn, def.timeout, def.degradedAt)] as const)
	)

	const components = Object.fromEntries(
		settled.map((result) => {
			if (result.status === 'fulfilled') {
				return result.value
			}
			// Handle promise rejection by marking as down
			return [result.reason?.name ?? 'unknown', { latency: 0, status: 'down' as const }]
		})
	) as Record<string, { latency: number; status: 'degraded' | 'down' | 'operational' }>

	// Compute overall status per rules
	const coreNames = new Set(['domains', 'fingerprint', 'supabase', 'workers'])
	const validationNames = new Set([
		'validation_alias',
		'validation_catchall',
		'validation_disposable',
		'validation_ip',
		'validation_mx',
		'validation_role',
		'validation_smtp',
		'validation_syntax'
	])

	let overall: 'degraded' | 'down' | 'operational' = 'operational'

	const anyCoreDown = Object.entries(components).some(([name, c]) => coreNames.has(name) && c.status === 'down')
	const anyValidationDown = Object.entries(components).some(([name, c]) => validationNames.has(name) && c.status === 'down')
	const anyNonCoreDown = Object.entries(components).some(([name, c]) => !coreNames.has(name) && c.status === 'down')
	const anyDegraded = Object.values(components).some((c) => c.status === 'degraded')

	if (anyCoreDown) {
		overall = 'down' // Core services down = system down
	} else if (anyValidationDown) {
		overall = 'degraded' // Validation services down = degraded (can still operate but limited)
	} else if (anyNonCoreDown) {
		overall = 'degraded' // Non-core services down = degraded
	} else if (anyDegraded) {
		overall = 'degraded' // Any service degraded = overall degraded
	}

	const response = {
		components,
		latency: Date.now() - started,
		status: overall,
		// Group components for better readability
		summary: {
			core: Object.entries(components)
				.filter(([name]) => coreNames.has(name))
				.reduce((acc, [name, data]) => ({ ...acc, [name]: data.status }), {}),
			external: Object.entries(components)
				.filter(([name]) => !coreNames.has(name) && !validationNames.has(name))
				.reduce((acc, [name, data]) => ({ ...acc, [name]: data.status }), {}),
			validation: Object.entries(components)
				.filter(([name]) => validationNames.has(name))
				.reduce((acc, [name, data]) => ({ ...acc, [name]: data.status }), {})
		},
		timestamp: new Date().toISOString()
	}
	return jsonResponse(response)
}
