import type { RiskThresholds, ValidationToggles } from '../types'
import { ValidationAction } from '../types'

export const DEFAULT_THRESHOLDS: RiskThresholds = {
	block: 100,
	flag: 60
}

export const DEFAULT_VALIDATIONS: ValidationToggles = {
	syntax: ValidationAction.BLOCK, // Critical - invalid syntax should block
	disposable: ValidationAction.BLOCK, // High risk - block disposable emails
	device: ValidationAction.FLAG, // Flag suspicious device behavior
	mx: ValidationAction.FLAG, // Flag missing MX records
	ip: ValidationAction.FLAG, // Flag VPN/fraud IPs
	alias: ValidationAction.FLAG, // Flag email aliases
	catchall: ValidationAction.INACTIVE, // Slow check - off by default
	roleEmail: ValidationAction.INACTIVE, // Not always bad - off by default
	smtp: ValidationAction.INACTIVE // Very slow check - off by default
}
