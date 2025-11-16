import type { ValidationToggles } from '../types'
import { ValidationAction } from '../types'

export const DEFAULT_VALIDATIONS: ValidationToggles = {
	alias: ValidationAction.FLAG,
	catchall: ValidationAction.ALLOW,
	device: ValidationAction.FLAG,
	disposable: ValidationAction.BLOCK,
	ip: ValidationAction.FLAG,
	mx: ValidationAction.BLOCK,
	roleEmail: ValidationAction.ALLOW,
	smtp: ValidationAction.ALLOW,
	syntax: ValidationAction.BLOCK
}
