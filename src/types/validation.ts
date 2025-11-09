export type CheckResult = {
	error?: string
	latency: number
	metadata?: Record<string, unknown>
	pass: boolean
}

export type DeviceData = {
	emailsUsed: number
	firstSeen: number
	isKnownDevice: boolean
	isNewEmail: boolean
	lastSeen?: number
	previousSignups: number
}

export type DeviceFingerprint = {
	canvas?: string
	cpuCores?: number
	deviceMemory?: number
	fonts?: string[]
	hash?: string
	screen: string
	timezone: string
	touchSupport?: boolean
	userAgent: string
	webgl?: string
}

export type IPData = {
	ip: string
	isFraud: boolean
	isVPN: boolean
}

export type ValidationLog = {
	checks: Record<string, CheckResult>
	created_at: string
	email_encrypted: string
	email_hash: string
	fingerprint_id: null | string
	ip_address: null | string
	is_valid: boolean
	latency_ms: number
	project_id: string
	recommendation: string
	risk_score: number
	signals: string[]
}

export type ValidationRequest = {
	email: string
	fingerprint?: DeviceFingerprint
	validations?: Partial<ValidationToggles>
}

export type ValidationResponse = {
	checks: Record<string, CheckResult>
	isValid: boolean
	metadata: {
		fingerprintId: null | string
		previousSignups: number
		totalLatency: number
	}
	recommendation: string
	riskScore: number
	signals: string[]
}

export type ValidationResults = {
	checks: Record<string, CheckResult>
	deviceData: DeviceData | null
	ipData?: IPData | null
	signals: string[]
}

export enum ValidationAction {
	BLOCK = 'block',
	FLAG = 'flag',
	INACTIVE = 'inactive'
}

export type ValidationToggles = {
	alias: ValidationAction
	catchall: ValidationAction
	device: ValidationAction
	disposable: ValidationAction
	ip: ValidationAction
	mx: ValidationAction
	roleEmail: ValidationAction
	smtp: ValidationAction
	syntax: ValidationAction
}
