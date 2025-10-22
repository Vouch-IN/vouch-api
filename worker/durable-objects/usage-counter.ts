import { DurableObject } from 'cloudflare:workers'

import { createClient, type SupabaseClient } from '../lib/supabase'

type UsageRequest = { month: string; projectId: string }

export class UsageCounter extends DurableObject {
	private client: SupabaseClient | undefined
	private lastFlushedCount = 0

	constructor(state: DurableObjectState, env: Env) {
		super(state, env)
		this.client = createClient(env)
	}

	async check({ month }: UsageRequest) {
		const count = (await this.ctx.storage.get<number>('count')) ?? 0
		const resetAt = this.getResetTimestamp(month)
		return { count, resetAt }
	}

	async flush({ month, projectId }: UsageRequest) {
		const count = (await this.ctx.storage.get<number>('count')) ?? 0
		await this.flushCore(month, projectId, count)
		return { count, flushed: true }
	}

	async flushCore(month: string, projectId: string, count: number): Promise<void> {
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

	async increment({ month, projectId }: UsageRequest) {
		const count = ((await this.ctx.storage.get<number>('count')) ?? 0) + 1
		await this.ctx.storage.put('count', count)

		// Fire-and-forget batch flush to Supabase if threshold met
		if (count - this.lastFlushedCount >= 10 || count === 1) {
			void this.flushCore(month, projectId, count)
			this.lastFlushedCount = count
		}

		return { count }
	}

	private getResetTimestamp(month: string): number {
		const [year, monthNum] = month.split('-').map(Number) as [number, number]
		const nextMonth = monthNum === 12 ? 1 : monthNum + 1
		const nextYear = monthNum === 12 ? year + 1 : year
		const resetDate = new Date(nextYear, nextMonth - 1, 1)
		return Math.floor(resetDate.getTime() / 1000)
	}
}
