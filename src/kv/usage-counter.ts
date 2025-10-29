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

export async function flushAllUsage(env: Env) {
	const client = createClient(env)
	const allKeys = await env.USAGE_COUNTER.list()

	let flushed = 0
	const errors: string[] = []

	for (const { name } of allKeys.keys) {
		try {
			const countStr = await env.USAGE_COUNTER.get<string>(name)
			if (!countStr) continue

			const [projectId, month] = name.split(':')
			const count = parseInt(countStr, 10)

			const upsertPayload = {
				count,
				month,
				project_id: projectId,
				updated_at: new Date().toISOString()
			}

			const { error } = await client
				.from('usage')
				.upsert([upsertPayload], { onConflict: 'project_id,month' })

			if (error) {
				errors.push(`${name}: ${error.message}`)
			} else {
				flushed++
			}
		} catch (err) {
			errors.push(`${name}: ${String(err)}`)
		}
	}

	console.log(`Flushed ${flushed} usage records`)
	if (errors.length > 0) {
		console.error('Usage flush errors:', errors)
	}

	return { errors, flushed }
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
		// limit_exceeded_at: new Date().toISOString()
	}

	const { error } = await client
		.from('usage')
		.upsert([upsertPayload], { onConflict: 'project_id,month' })

	if (error) console.error('Failed to sync usage to Supabase:', error.message)
	else lastFlushedCount = count
}

async function getUsageCount({ month, projectId }: UsageRequest, env: Env) {
	const key = `${projectId}:${month}`
	const countStr = (await env.USAGE_COUNTER.get<string>(key)) ?? '0'
	return parseInt(countStr, 10)
}
