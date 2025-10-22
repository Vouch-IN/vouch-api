import { FREE_VALIDATIONS_LIMIT } from '../../constants'
import { type Entitlements, type QuotaResult } from '../../types'

export async function checkUsageQuota(projectId: string, entitlements: Entitlements, env: Env): Promise<QuotaResult> {
	const startTotal = performance.now()
	const currentMonth = new Date().toISOString().substring(0, 7)

	// Get usage from Durable Object (source of truth)
	const startStubCreation = performance.now()
	const id = env.USAGE_COUNTER.idFromName(`${projectId}:${currentMonth}`)
	const stub = env.USAGE_COUNTER.get(id)
	const stubCreationDuration = performance.now() - startStubCreation

	const startFetch = performance.now()
	const response = await stub.fetch('https://do/check', {
		body: JSON.stringify({ month: currentMonth, projectId }),
		headers: { 'Content-Type': 'application/json' },
		method: 'POST'
	})
	const fetchDuration = performance.now() - startFetch

	const startParse = performance.now()
	const body: { count: number; resetAt: number } = await response.json()
	const parseDuration = performance.now() - startParse

	const totalDuration = performance.now() - startTotal
	console.log(`Worker->DO checkUsageQuota: stubCreation: ${stubCreationDuration}ms, fetchDuration: ${fetchDuration}ms, parseDuration: ${parseDuration}ms, total: ${totalDuration}ms`)

	const { count, resetAt } = body

	const limit = entitlements.validationsLimit ?? FREE_VALIDATIONS_LIMIT

	// Free: hard block
	// TODO: Paid: soft block (check if within grace period)
	if (count >= limit) {
		return {
			allowed: false,
			current: count,
			limit,
			resetAt
		}
	}

	return {
		allowed: true,
		current: count,
		limit,
		resetAt
	}
}

export async function incrementUsage(projectId: string, env: Env): Promise<void> {
	const startTotal = performance.now()
	const currentMonth = new Date().toISOString().substring(0, 7)

	const startStubCreation = performance.now()
	const id = env.USAGE_COUNTER.idFromName(`${projectId}:${currentMonth}`)
	const stub = env.USAGE_COUNTER.get(id)
	const stubCreationDuration = performance.now() - startStubCreation

	const startFetch = performance.now()
	await stub.fetch('https://do/increment', {
		body: JSON.stringify({ month: currentMonth, projectId }),
		method: 'POST'
	})
	const fetchDuration = performance.now() - startFetch

	const totalDuration = performance.now() - startTotal
	console.log(`Worker->DO incrementUsage: stubCreation: ${stubCreationDuration}ms, fetchDuration: ${fetchDuration}ms, total: ${totalDuration}ms`)
}
