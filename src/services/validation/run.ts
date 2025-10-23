import { type ValidationResults, type ValidationToggles } from '../../types'
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

export async function runValidations(
	projectId: string,
	emailInput: string,
	enabledValidations: ValidationToggles,
	fingerprintHash: null | string,
	ip: null | string,
	asn: unknown,
	env: Env
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

	// TODO: Return early
	// Syntax validation (synchronous - run immediately)
	const syntaxStart = performance.now()
	const syntaxValid = validateEmailSyntax(email)
	results.checks.syntax = { latency: performance.now() - syntaxStart, pass: syntaxValid }
	if (!syntaxValid) results.signals.push('invalid_syntax')

	// Alias detection (synchronous but grouped for consistency)
	if (enabledValidations.alias) {
		const aliasStart = performance.now()
		const hasAlias = detectAliasPattern(email, localPart)
		results.checks.alias = { latency: performance.now() - aliasStart, pass: !hasAlias }
		if (hasAlias) results.signals.push('alias_pattern')
	}

	// Role email detection (synchronous but grouped for consistency)
	if (enabledValidations.roleEmail) {
		const roleStart = performance.now()
		const isRoleEmail = detectRoleEmail(localPart)
		results.checks.roleEmail = { latency: performance.now() - roleStart, pass: !isRoleEmail }
		if (isRoleEmail) results.signals.push('role_email')
	}

	// Prepare all async validation promises in parallel
	const validationPromises: Promise<void>[] = []

	// All async validations run in parallel
	if (enabledValidations.disposable) {
		validationPromises.push(
			(async () => {
				const disposableStart = performance.now()
				try {
					const isDisposable = await checkDisposableEmail(domainPart, env)
					results.checks.disposable = { latency: performance.now() - disposableStart, pass: !isDisposable }
					if (isDisposable) results.signals.push('disposable_email')
				} catch {
					results.checks.disposable = {
						error: 'disposable_check_failed',
						latency: performance.now() - disposableStart,
						pass: true
					}
				}
			})()
		)
	}

	if (enabledValidations.mx) {
		validationPromises.push(
			(async () => {
				const mxStart = performance.now()
				try {
					const hasMX = await checkMXRecords(email, domainPart, env)
					if (hasMX === null) {
						results.checks.mx = { error: 'mx_unreachable', latency: performance.now() - mxStart, pass: true }
					} else {
						results.checks.mx = { latency: performance.now() - mxStart, pass: hasMX }
						if (!hasMX) results.signals.push('invalid_mx')
					}
				} catch {
					results.checks.mx = { error: 'mx_check_failed', latency: performance.now() - mxStart, pass: true }
				}
			})()
		)
	}

	if (enabledValidations.smtp) {
		validationPromises.push(
			(async () => {
				const smtpStart = performance.now()
				try {
					const smtpValid = await verifySMTP(email, env)
					results.checks.smtp = { latency: performance.now() - smtpStart, pass: smtpValid }
					if (!smtpValid) results.signals.push('smtp_fail')
				} catch {
					results.checks.smtp = {
						error: 'smtp_check_failed',
						latency: performance.now() - smtpStart,
						pass: true
					}
				}
			})()
		)
	}

	if (enabledValidations.catchall) {
		validationPromises.push(
			(async () => {
				const catchAllStart = performance.now()
				try {
					const isCatchAll = await detectCatchAll(email, env)
					results.checks.catchall = { latency: performance.now() - catchAllStart, pass: !isCatchAll }
					if (isCatchAll) results.signals.push('catchall_domain')
				} catch {
					results.checks.catchall = {
						error: 'catchall_check_failed',
						latency: performance.now() - catchAllStart,
						pass: true
					}
				}
			})()
		)
	}

	if (enabledValidations.ip && ip) {
		validationPromises.push(
			(async () => {
				const ipStart = performance.now()
				try {
					const ipData = await checkIPReputation(ip, asn, env)
					results.ipData = ipData
					results.checks.ip = {
						latency: performance.now() - ipStart,
						pass: !ipData.isVPN && !ipData.isFraud
					}
					if (ipData.isVPN) results.signals.push('vpn_detected')
					if (ipData.isFraud) results.signals.push('fraud_ip')
				} catch {
					results.checks.ip = {
						error: 'ip_check_failed',
						latency: performance.now() - ipStart,
						pass: true
					}
				}
			})()
		)
	}

	if (enabledValidations.device && fingerprintHash && projectId) {
		validationPromises.push(
			(async () => {
				const deviceStart = performance.now()
				try {
					const deviceData = await checkDeviceFingerprint(fingerprintHash, email, projectId, ip, env)
					results.deviceData = deviceData
					results.checks.device = {
						latency: performance.now() - deviceStart,
						pass: deviceData.isNewEmail && deviceData.previousSignups >= 3
					}
					if (deviceData.previousSignups > 0) {
						results.signals.push('device_reuse', `device_seen_${deviceData.previousSignups}_times`)
					}
				} catch {
					results.checks.device = {
						error: 'device_check_failed',
						latency: performance.now() - deviceStart,
						pass: true
					}
				}
			})()
		)
	}

	// Wait for all async validations to complete in parallel
	await Promise.allSettled(validationPromises)

	return results
}
