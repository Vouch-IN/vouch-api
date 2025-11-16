import { type ValidationToggles } from './validation'

export type Entitlements = {
	endsAt: null | string
	features: string[]
	logRetentionDays: number
	startsAt: string
	teamLimit: number
	validationsLimit: number
}

export type ProjectSettings = {
	blacklist: string[]
	cachedAt: number
	entitlements: Entitlements
	projectId: string
	subscription?: SubscriptionMetadata
	validations: ValidationToggles
	whitelist: string[]
}

export type QuotaResult = {
	allowed: boolean
	current: number
	inGracePeriod?: boolean
	limit: number
	resetAt: number
}

export type SubscriptionMetadata = {
	billingCycle: 'custom' | 'monthly' | 'yearly'
	currentPeriodEnd: string
	currentPeriodStart: string
	status: 'active' | 'canceled' | 'past_due' | 'paused' | 'trialing'
}
