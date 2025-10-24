import { FREE_VALIDATIONS_LIMIT } from '../../constants'
import { checkUsage, increment } from '../../kv'
import { type Entitlements, type QuotaResult } from '../../types'

export async function checkUsageQuota(
	projectId: string,
	entitlements: Entitlements,
	env: Env
): Promise<QuotaResult> {
	const currentMonth = new Date().toISOString().substring(0, 7)

	const { count, resetAt } = await checkUsage({ month: currentMonth, projectId }, env)

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
	const currentMonth = new Date().toISOString().substring(0, 7)

	await increment({ month: currentMonth, projectId }, env)
}
