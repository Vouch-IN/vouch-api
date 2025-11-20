import { enqueueLogs } from '../../kv'
import { type ValidationAction, type ValidationLog, type ValidationResults } from '../../types'
import { encrypt, sha256Hex } from '../../utils'

export async function recordValidationLog(
	projectId: string,
	email: string,
	validationResults: ValidationResults,
	fingerprintHash: null | string,
	ip: null | string,
	country: string | undefined,
	deviceType: string | undefined,
	recommendation: ValidationAction,
	totalLatency: number,
	env: Env
): Promise<void> {
	// Hash email for privacy
	const emailHash = await sha256Hex(email)

	// Encrypt email for storage (using project-specific key)
	const emailEncrypted = await encrypt(email, projectId, env)

	const log: ValidationLog = {
		checks: validationResults.checks,
		country,
		created_at: new Date().toISOString(),
		device_type: deviceType,
		email_encrypted: emailEncrypted,
		email_hash: emailHash,
		fingerprint_id: fingerprintHash,
		ip_address: ip,
		latency_ms: totalLatency,
		project_id: projectId,
		recommendation,
		signals: validationResults.signals
	}

	await enqueueLogs(projectId, [log], env)
}
