import { type RiskThresholds, type ValidationToggles } from '../types'

export const DEFAULT_THRESHOLDS: RiskThresholds = {
	allow: 30,
	block: 100,
	flag: 60
}

export const DEFAULT_VALIDATIONS: ValidationToggles = {
	alias: true,
	catchall: false,
	device: true,
	disposable: true,
	ip: true,
	mx: true,
	roleEmail: false,
	smtp: false,
	syntax: true
}
