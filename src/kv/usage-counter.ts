import { createClient } from '../lib/supabase'

type UsageRequest = {
	month: string
	projectId: string
}

let lastFlushedCount = 0

export async function checkUsage(request: UsageRequest, env: Env) {
	const count = await getUsageCount(request, env)
	const resetAt = getResetTimestamp(request.month)
	return { count, resetAt }
}

export async function flushUsage(request: UsageRequest, env: Env) {
	const count = await getUsageCount(request, env)
	await flushUsageCore(request, count, env)
	return { count, flushed: true }
}

export function getResetTimestamp(month: string): number {
	const [year, monthNum] = month.split('-').map(Number) as [number, number]
	const nextMonth = monthNum === 12 ? 1 : monthNum + 1
	const nextYear = monthNum === 12 ? year + 1 : year
	const resetDate = new Date(nextYear, nextMonth - 1, 1)
	return Math.floor(resetDate.getTime() / 1000)
}

export async function increment(request: UsageRequest, env: Env) {
	const count = (await getUsageCount(request, env)) + 1
	const key = `${request.projectId}:${request.month}`
	await env.USAGE_COUNTER.put(key, count.toString())

	// Fire-and-forget batch flush to Supabase if threshold met
	if (count - lastFlushedCount >= 10 || count === 1) {
		void flushUsageCore(request, count, env)
		lastFlushedCount = count
	}

	return { count }
}

async function flushUsageCore(
	{ month, projectId }: UsageRequest,
	count: number,
	env: Env
): Promise<void> {
	const client = createClient(env)

	const upsertPayload = {
		count,
		month,
		project_id: projectId,
		updated_at: new Date().toISOString()
	}

	const { error } = await client
		.from('usage')
		.upsert([upsertPayload], { onConflict: 'usage_project_id_month_key' })

	if (error) console.error('Failed to sync usage to Supabase:', error.message)
}

async function getUsageCount({ month, projectId }: UsageRequest, env: Env) {
	const key = `${projectId}:${month}`
	const countStr = (await env.USAGE_COUNTER.get<string>(key)) ?? '0'
	return parseInt(countStr, 10)
}
