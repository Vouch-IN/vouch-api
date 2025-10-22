import { type ValidationToggles } from './validation'

export type Entitlements = {
	validationsLimit?: number
}

export type ProjectSettings = {
	blacklist: string[]
	cachedAt: number
	entitlements: Entitlements
	projectId: string
	riskWeights: RiskWeights
	subscription?: SubscriptionMetadata
	thresholds: RiskThresholds
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

export type Recommendation = 'allow' | 'block' | 'flag'

export type RiskThresholds = {
	allow: number
	block: number
	flag: number
}

export type RiskWeights = {
	alias: number
	catchall: number
	deviceReuse: number
	disposable: number
	fraudIp: number
	invalidMx: number
	invalidSyntax: number
	roleEmail: number
	smtpFail: number
	vpnIp: number
}

export type SubscriptionMetadata = {
	billingCycle: 'custom' | 'monthly' | 'yearly'
	currentPeriodEnd: string
	currentPeriodStart: string
	status: 'active' | 'canceled' | 'past_due' | 'paused' | 'trialing'
}
