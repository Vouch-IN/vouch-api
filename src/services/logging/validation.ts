import { enqueueLogs } from '../../kv'
import { type Recommendation, type ValidationLog, type ValidationResults } from '../../types'
import { encrypt, sha256Hex } from '../../utils'

export async function recordValidationLog(
	projectId: string,
	email: string,
	validationResults: ValidationResults,
	fingerprintHash: null | string,
	ip: null | string,
	riskScore: number,
	recommendation: Recommendation,
	totalLatency: number,
	isValid: boolean,
	env: Env
): Promise<void> {
	// Hash email for privacy
	const emailHash = await sha256Hex(email)

	// Encrypt email for storage (using project-specific key)
	const emailEncrypted = await encrypt(email, projectId, env)

	const log: ValidationLog = {
		checks: validationResults.checks,
		created_at: new Date().toISOString(),
		email_encrypted: emailEncrypted,
		email_hash: emailHash,
		fingerprint_id: fingerprintHash,
		ip_address: ip,
		is_valid: isValid,
		latency_ms: totalLatency,
		project_id: projectId,
		recommendation,
		risk_score: riskScore,
		signals: validationResults.signals
	}

	await enqueueLogs(projectId, [log], env)
}
