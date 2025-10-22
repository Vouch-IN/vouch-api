import { DurableObject } from 'cloudflare:workers'

import { createClient, type SupabaseClient } from '../lib/supabase'
import { errorResponse, jsonResponse } from '../utils'

type UsageRequest = { month: string; projectId: string }

export class UsageCounter extends DurableObject {
	private client: SupabaseClient | undefined
	private lastFlushedCount = 0

	constructor(state: DurableObjectState, env: Env) {
		super(state, env)
		this.client = createClient(env)
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url)
		if (url.pathname === '/check') {
			return this.checkUsage(request)
		}
		if (url.pathname === '/increment') {
			return this.incrementUsage(request)
		}
		if (url.pathname === '/flush') {
			return this.flushUsage(request)
		}
		return errorResponse('not_found', '404 Not Found', 404)
	}

	private async checkUsage(request: Request): Promise<Response> {
		const body: UsageRequest = await request.json()
		const { month } = body
		const count = (await this.ctx.storage.get<number>('count')) ?? 0
		const resetAt = this.getResetTimestamp(month)
		return jsonResponse({ count, resetAt })
	}

	private async flushUsage(request: Request): Promise<Response> {
		const body: UsageRequest = await request.json()
		const { month, projectId } = body
		const count = (await this.ctx.storage.get<number>('count')) ?? 0
		await this.flushUsageCore(month, projectId, count)
		return jsonResponse({ count, flushed: true })
	}

	private async flushUsageCore(month: string, projectId: string, count: number): Promise<void> {
		if (!this.client) {
			console.error('Supabase client not initialized')
			return
		}

		const upsertPayload = {
			count,
			month,
			project_id: projectId,
			updated_at: new Date().toISOString()
		}

		const { error } = await this.client.from('usage').upsert([upsertPayload], { onConflict: 'usage_project_id_month_key' })

		if (error) console.error('Failed to sync usage to Supabase:', error.message)
	}

	private getResetTimestamp(month: string): number {
		const [year, monthNum] = month.split('-').map(Number) as [number, number]
		const nextMonth = monthNum === 12 ? 1 : monthNum + 1
		const nextYear = monthNum === 12 ? year + 1 : year
		const resetDate = new Date(nextYear, nextMonth - 1, 1)
		return Math.floor(resetDate.getTime() / 1000)
	}

	private async incrementUsage(request: Request): Promise<Response> {
		const body: UsageRequest = await request.json()
		const { month, projectId } = body
		const count = ((await this.ctx.storage.get<number>('count')) ?? 0) + 1
		await this.ctx.storage.put('count', count)

		// Fire-and-forget batch flush to Supabase if threshold met
		if (count - this.lastFlushedCount >= 10 || count === 1) {
			void this.flushUsageCore(month, projectId, count)
			this.lastFlushedCount = count
		}

		return jsonResponse({ count })
	}
}
