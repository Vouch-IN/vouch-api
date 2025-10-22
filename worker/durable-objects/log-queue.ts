import { DurableObject } from 'cloudflare:workers'

import { LOG_QUEUE_BATCH_SIZE, MAX_LOG_QUEUE_SIZE } from '../constants'
import { createClient, type SupabaseClient } from '../lib/supabase'
import type { TablesInsert, ValidationLog } from '../types'
import { errorResponse, jsonResponse } from '../utils'

type EnqueueRequest = {
	logs: ValidationLog[]
}

export class LogQueue extends DurableObject {
	private client: SupabaseClient | undefined
	private isFlushing = false

	constructor(state: DurableObjectState, env: Env) {
		super(state, env)
		this.client = createClient(env)
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url)
		if (url.pathname === '/enqueue') return this.enqueue(request)
		if (url.pathname === '/flush') return this.flush()
		if (url.pathname === '/status') {
			const queue = (await this.ctx.storage.get<ValidationLog[]>('queue')) ?? []
			return jsonResponse({ queueSize: queue.length })
		}
		return errorResponse('not_found', '404 Not Found', 404)
	}

	private async enqueue(request: Request): Promise<Response> {
		const body: EnqueueRequest = await request.json()
		const { logs } = body

		let queue = (await this.ctx.storage.get<ValidationLog[]>('queue')) ?? []

		queue.push(...logs)

		if (queue.length > MAX_LOG_QUEUE_SIZE) {
			console.warn('Log queue exceeding 10K, dropping oldest logs')
			queue = queue.slice(-MAX_LOG_QUEUE_SIZE)
		}

		await this.ctx.storage.put('queue', queue)

		void this.tryFlush().catch((err: unknown) => {
			console.error('Flush failed:', err)
		})

		return jsonResponse({
			queued: logs.length,
			totalQueue: queue.length
		})
	}

	private async flush(): Promise<Response> {
		await this.tryFlush()
		const queue = (await this.ctx.storage.get<ValidationLog[]>('queue')) ?? []
		return jsonResponse({
			remainingQueue: queue.length,
			success: true
		})
	}

	private async tryFlush(): Promise<void> {
		if (this.isFlushing) return
		this.isFlushing = true

		try {
			let queue = (await this.ctx.storage.get<ValidationLog[]>('queue')) ?? []

			if (queue.length === 0) {
				return
			}

			if (!this.client) {
				console.error('Supabase client not initialized')
				return
			}

			while (queue.length > 0) {
				const batch = queue.slice(0, LOG_QUEUE_BATCH_SIZE) as TablesInsert<'validation_logs'>[]

				const { error } = await this.client.from('validation_logs').insert(batch)

				if (error) {
					console.error('Failed to insert logs:', error.message)
					break // Stop flushing on error to avoid data loss
				}

				queue = queue.slice(LOG_QUEUE_BATCH_SIZE)
				await this.ctx.storage.put('queue', queue)
			}

			console.log(`Flushed logs, ${queue.length} remaining in queue`)
		} catch (err) {
			console.error('Flush error:', err)
		} finally {
			this.isFlushing = false
		}
	}
}
