import type { RiskThresholds, ValidationToggles } from '../types'
import { ValidationAction } from '../types'

export const DEFAULT_THRESHOLDS: RiskThresholds = {
	block: 100,
	flag: 60
}

export const DEFAULT_VALIDATIONS: ValidationToggles = {
	alias: ValidationAction.FLAG, // Flag email aliases
	catchall: ValidationAction.INACTIVE, // Slow check - off by default
	device: ValidationAction.FLAG, // Flag suspicious device behavior
	disposable: ValidationAction.BLOCK, // High risk - block disposable emails
	ip: ValidationAction.FLAG, // Flag VPN/fraud IPs
	mx: ValidationAction.FLAG, // Flag missing MX records
	roleEmail: ValidationAction.INACTIVE, // Not always bad - off by default
	smtp: ValidationAction.INACTIVE, // Very slow check - off by default
	syntax: ValidationAction.BLOCK // Critical - invalid syntax should block
}
