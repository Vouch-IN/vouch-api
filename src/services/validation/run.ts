import type { ValidationResults, ValidationToggles } from '../../types'
import { ValidationAction } from '../../types'
import { createLogger } from '../../utils'
import { checkDeviceFingerprint } from '../device-validation'
import {
	checkDisposableEmail,
	checkMXRecords,
	detectAliasPattern,
	detectCatchAll,
	detectRoleEmail,
	validateEmailSyntax,
	verifySMTP
} from '../email-validation'
import { checkIPReputation } from '../ip-validation'

const logger = createLogger({ service: 'validation' })

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

	// All async validations start executing immediately in parallel
	// We track BLOCK validations separately for early exit optimization
	// Both BLOCK and FLAG validations run concurrently for maximum performance
	const blockValidations: Promise<boolean>[] = []
	const allValidations: Promise<void>[] = []

	// Disposable email check (starts immediately)
	if (enabledValidations.disposable !== ValidationAction.INACTIVE) {
		const promise = (async () => {
			const disposableStart = performance.now()
			try {
				const isDisposable = await checkDisposableEmail(domainPart, env)
				results.checks.disposable = {
					latency: performance.now() - disposableStart,
					pass: !isDisposable
				}
				if (isDisposable) {
					results.signals.push('disposable_email')
					return true // Failed check
				}
				return false
			} catch {
				results.checks.disposable = {
					error: 'disposable_check_failed',
					latency: performance.now() - disposableStart,
					pass: true
				}
				return false
			}
		})()

		allValidations.push(promise.then(() => {}))
		
		if (enabledValidations.disposable === ValidationAction.BLOCK) {
			blockValidations.push(promise) // Track for early exit if it fails
		}
	}

	// Role email detection (starts immediately in parallel)
	if (enabledValidations.roleEmail !== ValidationAction.INACTIVE) {
		const promise = (async () => {
			const roleStart = performance.now()
			try {
				const isRoleEmail = await detectRoleEmail(localPart, env)
				results.checks.roleEmail = {
					latency: performance.now() - roleStart,
					pass: !isRoleEmail
				}
				if (isRoleEmail) {
					results.signals.push('role_email')
					return true // Failed check
				}
				return false
			} catch {
				results.checks.roleEmail = {
					error: 'role_email_check_failed',
					latency: performance.now() - roleStart,
					pass: true
				}
				return false
			}
		})()

		allValidations.push(promise.then(() => {}))
		
		if (enabledValidations.roleEmail === ValidationAction.BLOCK) {
			blockValidations.push(promise)
		}
	}

	// MX records check (starts immediately in parallel)
	if (enabledValidations.mx !== ValidationAction.INACTIVE) {
		const promise = (async () => {
			const mxStart = performance.now()
			try {
				const hasMX = await checkMXRecords(email, domainPart, env)
				if (hasMX === null) {
					results.checks.mx = {
						error: 'mx_unreachable',
						latency: performance.now() - mxStart,
						pass: true
					}
					return false
				} else {
					results.checks.mx = { latency: performance.now() - mxStart, pass: hasMX }
					if (!hasMX) {
						results.signals.push('invalid_mx')
						return true // Failed check
					}
					return false
				}
			} catch {
				results.checks.mx = {
					error: 'mx_check_failed',
					latency: performance.now() - mxStart,
					pass: true
				}
				return false
			}
		})()

		allValidations.push(promise.then(() => {}))
		
		if (enabledValidations.mx === ValidationAction.BLOCK) {
			blockValidations.push(promise)
		}
	}

	// SMTP verification (starts immediately in parallel)
	if (enabledValidations.smtp !== ValidationAction.INACTIVE) {
		const promise = (async () => {
			const smtpStart = performance.now()
			try {
				const smtpValid = await verifySMTP(email, env)
				results.checks.smtp = { latency: performance.now() - smtpStart, pass: smtpValid }
				if (!smtpValid) {
					results.signals.push('smtp_fail')
					return true // Failed check
				}
				return false
			} catch {
				results.checks.smtp = {
					error: 'smtp_check_failed',
					latency: performance.now() - smtpStart,
					pass: true
				}
				return false
			}
		})()

		allValidations.push(promise.then(() => {}))
		
		if (enabledValidations.smtp === ValidationAction.BLOCK) {
			blockValidations.push(promise)
		}
	}

	// Catch-all detection (starts immediately in parallel)
	if (enabledValidations.catchall !== ValidationAction.INACTIVE) {
		const promise = (async () => {
			const catchAllStart = performance.now()
			try {
				const isCatchAll = await detectCatchAll(email, env)
				results.checks.catchall = {
					latency: performance.now() - catchAllStart,
					pass: !isCatchAll
				}
				if (isCatchAll) {
					results.signals.push('catchall_domain')
					return true // Failed check
				}
				return false
			} catch {
				results.checks.catchall = {
					error: 'catchall_check_failed',
					latency: performance.now() - catchAllStart,
					pass: true
				}
				return false
			}
		})()

		allValidations.push(promise.then(() => {}))
		
		if (enabledValidations.catchall === ValidationAction.BLOCK) {
			blockValidations.push(promise)
		}
	}

	// IP reputation check (starts immediately in parallel)
	if (enabledValidations.ip !== ValidationAction.INACTIVE && ip) {
		const promise = (async () => {
			const ipStart = performance.now()
			try {
				const ipData = await checkIPReputation(ip, asn, env, apiKeyType)
				results.ipData = ipData
				results.checks.ip = {
					latency: performance.now() - ipStart,
					pass: !ipData.isVPN && !ipData.isFraud
				}
				const failed = ipData.isVPN || ipData.isFraud
				if (ipData.isVPN) results.signals.push('vpn_detected')
				if (ipData.isFraud) results.signals.push('fraud_ip')
				return failed
			} catch {
				results.checks.ip = {
					error: 'ip_check_failed',
					latency: performance.now() - ipStart,
					pass: true
				}
				return false
			}
		})()

		allValidations.push(promise.then(() => {}))
		
		if (enabledValidations.ip === ValidationAction.BLOCK) {
			blockValidations.push(promise)
		}
	}

	// Device fingerprint check (starts immediately in parallel)
	if (enabledValidations.device !== ValidationAction.INACTIVE && fingerprintHash && projectId) {
		const promise = (async () => {
			const deviceStart = performance.now()
			try {
				const deviceData = await checkDeviceFingerprint(
					fingerprintHash,
					email,
					projectId,
					ip,
					env
				)
				results.deviceData = deviceData
				const deviceFailed = !deviceData.isNewEmail || deviceData.previousSignups >= 3
				results.checks.device = {
					latency: performance.now() - deviceStart,
					pass: !deviceFailed
				}
				if (deviceData.previousSignups > 0) {
					results.signals.push('device_reuse', `device_seen_${deviceData.previousSignups}_times`)
				}
				return deviceFailed
			} catch {
				results.checks.device = {
					error: 'device_check_failed',
					latency: performance.now() - deviceStart,
					pass: true
				}
				return false
			}
		})()

		allValidations.push(promise.then(() => {}))
		
		if (enabledValidations.device === ValidationAction.BLOCK) {
			blockValidations.push(promise)
		}
	}

	// At this point, all validations (BLOCK + FLAG) are already running in parallel
	// Now we implement smart early exit logic based on BLOCK validation results
	//
	// Strategy:
	// 1. If any BLOCK validation fails → return immediately (don't wait for FLAG validations)
	// 2. If all BLOCK validations pass → wait for all validations (including FLAG) to complete
	// 3. If no BLOCK validations exist → just wait for all FLAG validations
	if (blockValidations.length > 0) {
		// Race to detect first BLOCK failure or wait for all BLOCKs to complete
		const hasBlockFailure = await Promise.race([
			// Branch 1: Detect if any BLOCK validation fails (returns true immediately on first failure)
			Promise.any(
				blockValidations.map(p => p.then(failed => failed ? Promise.resolve(true) : Promise.reject()))
			).catch(() => false), // If all BLOCK validations pass, Promise.any rejects → no failure
			// Branch 2: Wait for all BLOCK validations to complete (returns false when all done)
			Promise.allSettled(blockValidations).then(() => false)
		])

		if (hasBlockFailure) {
			// A BLOCK validation failed - return immediately without waiting for FLAG validations
			return results
		}

		// All BLOCK validations passed - now wait for any remaining FLAG validations to complete
		await Promise.allSettled(allValidations)
	} else {
		// No BLOCK validations configured - just wait for all FLAG validations to complete
		await Promise.allSettled(allValidations)
	}

	return results
}
