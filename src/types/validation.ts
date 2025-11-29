export enum ValidationAction {
	ALLOW = 'allow',
	BLOCK = 'block',
	FLAG = 'flag'
}

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

export type IPData = {
	ip: string
	isFraud: boolean
	isVPN: boolean
}

export type ValidationLog = {
	checks: Record<string, CheckResult>
	country?: string
	created_at: string
	device_type?: string
	email_encrypted: string
	email_hash: string
	fingerprint_id: null | string
	ip_address: null | string
	latency_ms: number
	project_id: string
	recommendation: string
	signals: string[]
}

export type ValidationRequest = {
	email: string
	fingerprintHash?: string
	ip?: string
	projectId: string
	userAgent?: string
	validations?: Partial<ValidationToggles>
}

export type ValidationResponse = {
	checks: Record<string, CheckResult>
	metadata: {
		fingerprintId: null | string
		previousSignups: number
		totalLatency: number
	}
	recommendation: string
	signals: string[]
}

export type ValidationResults = {
	checks: Record<string, CheckResult>
	deviceData: DeviceData | null
	ipData?: IPData | null
	signals: string[]
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
