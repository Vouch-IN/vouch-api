import type { ValidationResults, ValidationToggles } from '../../types'
import { ValidationAction } from '../../types'
import { checkDeviceFingerprint } from '../device-validation'
import {
	checkDisposableEmail,
	checkMXRecords,
	detectAliasPattern,
	validateEmailSyntax
} from '../email-validation'
import { checkIPReputation } from '../ip-validation'

import { createValidationHelper } from './utils'

export async function runValidations(
	projectId: string,
	emailInput: string,
	enabledValidations: ValidationToggles,
	fingerprintHash: null | string,
	ip: null | string,
	asn: unknown,
	env: Env,
	apiKeyType?: 'client' | 'server'
) {
	const results: ValidationResults = {
		checks: {},
		deviceData: null,
		ipData: null,
		signals: []
	}

	const email = emailInput.trim().toLowerCase()
	const [localPart, domainPartRaw] = email.split('@')
	const domainPart = domainPartRaw || ''

	// Syntax validation (synchronous - run immediately)
	const syntaxStart = performance.now()
	const syntaxValid = validateEmailSyntax(email)
	results.checks.syntax = { latency: performance.now() - syntaxStart, pass: syntaxValid }
	if (!syntaxValid) {
		results.signals.push('invalid_syntax')
		// Early return if syntax check fails and is set to BLOCK
		if (enabledValidations.syntax === ValidationAction.BLOCK) {
			return results
		}
	}

	// Alias detection (synchronous but grouped for consistency)
	if (enabledValidations.alias !== ValidationAction.INACTIVE) {
		const aliasStart = performance.now()
		const hasAlias = detectAliasPattern(email, localPart)
		results.checks.alias = { latency: performance.now() - aliasStart, pass: !hasAlias }
		if (hasAlias) {
			results.signals.push('alias_pattern')
			// Early return if alias check fails and is set to BLOCK
			if (enabledValidations.alias === ValidationAction.BLOCK) {
				return results
			}
		}
	}

	// Separate BLOCK and FLAG validations for early-exit optimization
	const blockValidationPromises: Promise<void>[] = []
	const flagValidationPromises: Promise<void>[] = []

	// Create validation helper with automatic error handling and routing
	const addValidation = createValidationHelper(
		blockValidationPromises,
		flagValidationPromises,
		results
	)

	// All async validations run in parallel
	addValidation(enabledValidations.disposable, 'disposable', async () => {
		const startTime = performance.now()
		const isDisposable = await checkDisposableEmail(domainPart, env)
		results.checks.disposable = {
			latency: performance.now() - startTime,
			pass: !isDisposable
		}
		if (isDisposable) results.signals.push('disposable_email')
		return isDisposable
	})

	addValidation(enabledValidations.mx, 'mx', async () => {
		const startTime = performance.now()
		const hasMX = await checkMXRecords(email, domainPart, env)
		if (hasMX === null) {
			results.checks.mx = {
				error: 'mx_unreachable',
				latency: performance.now() - startTime,
				pass: true
			}
			return false // Don't block on unreachable MX
		}
		results.checks.mx = { latency: performance.now() - startTime, pass: hasMX }
		if (!hasMX) results.signals.push('invalid_mx')
		return !hasMX
	})

	if (ip) {
		addValidation(enabledValidations.ip, 'ip', async () => {
			const startTime = performance.now()
			const ipData = await checkIPReputation(ip, asn, env, apiKeyType)
			results.ipData = ipData
			results.checks.ip = {
				latency: performance.now() - startTime,
				pass: !ipData.isVPN && !ipData.isFraud
			}
			if (ipData.isVPN) results.signals.push('vpn_detected')
			if (ipData.isFraud) results.signals.push('fraud_ip')
			return ipData.isVPN || ipData.isFraud
		})
	}

	if (fingerprintHash && projectId) {
		addValidation(enabledValidations.device, 'device', async () => {
			const startTime = performance.now()
			const deviceData = await checkDeviceFingerprint(fingerprintHash, email, projectId, ip, env)
			results.deviceData = deviceData
			const deviceCheckFailed = !deviceData.isNewEmail || deviceData.previousSignups >= 3
			results.checks.device = {
				latency: performance.now() - startTime,
				pass: !deviceCheckFailed
			}
			if (deviceData.previousSignups > 0) {
				results.signals.push('device_reuse', `device_seen_${deviceData.previousSignups}_times`)
			}
			return deviceCheckFailed
		})
	}

	try {
		await Promise.all(blockValidationPromises)
		await Promise.allSettled(flagValidationPromises)
	} catch (error) {
		if (error instanceof Error && error.message === 'BLOCK_VALIDATION_FAILED') {
			return results
		}
		throw error
	}

	return results
}
