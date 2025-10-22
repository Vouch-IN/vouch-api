import { LOG_QUEUE_BATCH_SIZE, MAX_LOG_QUEUE_SIZE } from '../constants'
import { createClient } from '../lib/supabase'
import type { TablesInsert, ValidationLog } from '../types'

let isFlushing = false

export async function enqueueLogs(projectId: string, logs: ValidationLog[], env: Env) {
	let queue = await getQueueLogs(projectId, env)
	queue.push(...logs)

	if (queue.length > MAX_LOG_QUEUE_SIZE) {
		console.warn('Log queue exceeding 10K, dropping oldest logs')
		queue = queue.slice(-MAX_LOG_QUEUE_SIZE)
	}

	await env.LOG_QUEUE.put(projectId, JSON.stringify(queue))

	tryFlushLogs(projectId, env).catch((err: unknown) => {
		console.error('Flush failed:', err)
	})

	return {
		queued: logs.length,
		totalQueue: queue.length
	}
}

export async function flushLogs(projectId: string, env: Env) {
	await tryFlushLogs(projectId, env)
	const queue = await getQueueLogs(projectId, env)
	return {
		remainingQueue: queue.length,
		success: true
	}
}

export async function tryFlushLogs(projectId: string, env: Env) {
	const client = createClient(env)

	if (isFlushing) return

	isFlushing = true

	try {
		let queue = await getQueueLogs(projectId, env)

		if (queue.length === 0) {
			return
		}

		while (queue.length > 0) {
			const batch = queue.slice(0, LOG_QUEUE_BATCH_SIZE) as TablesInsert<'validation_logs'>[]

			const { error } = await client.from('validation_logs').insert(batch)

			if (error) {
				console.error('Failed to insert logs:', error.message)
				break // Stop flushing on error to avoid data loss
			}

			queue = queue.slice(LOG_QUEUE_BATCH_SIZE)
			await env.LOG_QUEUE.put(projectId, JSON.stringify(queue))
		}

		console.log(`Flushed logs, ${queue.length} remaining in queue`)
	} catch (err) {
		console.error('Flush error:', err)
	} finally {
		isFlushing = false
	}
}

async function getQueueLogs(projectId: string, env: Env) {
	return (await env.LOG_QUEUE.get<ValidationLog[]>(projectId, { type: 'json' })) ?? []
}
