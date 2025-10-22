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
		const startFetch = performance.now()
		const url = new URL(request.url)
		if (url.pathname === '/check') {
			const routingDuration = performance.now() - startFetch
			console.log(`UsageCounter fetch() routing to checkUsage: ${routingDuration}ms`)
			return this.checkUsage(request)
		}
		if (url.pathname === '/increment') {
			const routingDuration = performance.now() - startFetch
			console.log(`UsageCounter fetch() routing to incrementUsage: ${routingDuration}ms`)
			return this.incrementUsage(request)
		}
		if (url.pathname === '/flush') {
			const routingDuration = performance.now() - startFetch
			console.log(`UsageCounter fetch() routing to flushUsage: ${routingDuration}ms`)
			return this.flushUsage(request)
		}
		return errorResponse('not_found', '404 Not Found', 404)
	}

	private async checkUsage(request: Request): Promise<Response> {
		const startTotal = performance.now()

		const startParse = performance.now()
		const body: UsageRequest = await request.json()
		const parseDuration = performance.now() - startParse

		const { month } = body

		const startGet = performance.now()
		const count = (await this.ctx.storage.get<number>('count')) ?? 0
		const getDuration = performance.now() - startGet

		const resetAt = this.getResetTimestamp(month)

		const totalDuration = performance.now() - startTotal
		console.log(`UsageCounter checkUsage latency: parseDuration: ${parseDuration}ms, getDuration: ${getDuration}ms, total: ${totalDuration}ms`)

		return jsonResponse({ count, resetAt })
	}

	private async flushUsage(request: Request): Promise<Response> {
		const startTotal = performance.now()

		const startParse = performance.now()
		const body: UsageRequest = await request.json()
		const parseDuration = performance.now() - startParse

		const { month, projectId } = body

		const startGet = performance.now()
		const count = (await this.ctx.storage.get<number>('count')) ?? 0
		const getDuration = performance.now() - startGet

		const startFlush = performance.now()
		await this.flushUsageCore(month, projectId, count)
		const flushDuration = performance.now() - startFlush

		const totalDuration = performance.now() - startTotal
		console.log(`UsageCounter flushUsage latency: parseDuration: ${parseDuration}ms, getDuration: ${getDuration}ms, flushDuration: ${flushDuration}ms, total: ${totalDuration}ms`)

		return jsonResponse({ count, flushed: true })
	}

	private async flushUsageCore(month: string, projectId: string, count: number): Promise<void> {
		const startFlushCore = performance.now()

		if (!this.client) {
			console.error('Supabase client not initialized')
			return
		}

		const startPayload = performance.now()
		const upsertPayload = {
			count,
			month,
			project_id: projectId,
			updated_at: new Date().toISOString()
		}
		const payloadDuration = performance.now() - startPayload

		const startUpsert = performance.now()
		const { error } = await this.client.from('usage').upsert([upsertPayload], { onConflict: 'usage_project_id_month_key' })
		const upsertDuration = performance.now() - startUpsert

		const totalDuration = performance.now() - startFlushCore
		console.log(`UsageCounter flushUsageCore latency: payloadDuration: ${payloadDuration}ms, upsertDuration: ${upsertDuration}ms, total: ${totalDuration}ms`)

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
		const startTotal = performance.now()

		const startParse = performance.now()
		const body: UsageRequest = await request.json()
		const parseDuration = performance.now() - startParse

		const { month, projectId } = body

		const startGet = performance.now()
		const count = ((await this.ctx.storage.get<number>('count')) ?? 0) + 1
		const getDuration = performance.now() - startGet

		const startPut = performance.now()
		await this.ctx.storage.put('count', count)
		const putDuration = performance.now() - startPut

		const totalDuration = performance.now() - startTotal
		console.log(`UsageCounter incrementUsage latency: parseDuration: ${parseDuration}ms, getDuration: ${getDuration}ms, putDuration: ${putDuration}ms, total: ${totalDuration}ms`)

		// Fire-and-forget batch flush to Supabase if threshold met
		if (count - this.lastFlushedCount >= 10 || count === 1) {
			void this.flushUsageCore(month, projectId, count)
			this.lastFlushedCount = count
		}

		return jsonResponse({ count })
	}
}
