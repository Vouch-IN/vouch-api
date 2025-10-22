import { type Recommendation, type RiskThresholds, type ValidationLog, type ValidationResults } from '../../types'
import { encrypt, sha256Hex } from '../../utils'

export async function recordValidationLog(
	projectId: string,
	email: string,
	validationResults: ValidationResults,
	thresholds: RiskThresholds,
	fingerprintHash: null | string,
	ip: null | string,
	riskScore: number,
	recommendation: Recommendation,
	totalLatency: number,
	env: Env
): Promise<void> {
	// Hash email for privacy
	const emailHash = await sha256Hex(email)

	// Encrypt email for storage (using project-specific key)
	const emailEncrypted = await encrypt(email, projectId, env)

	const isValid = riskScore < thresholds.flag && !validationResults.signals.includes('invalid_syntax')

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

	const id = env.LOG_QUEUE.idFromName(projectId)
	const stub = env.LOG_QUEUE.get(id)
	await stub.enqueue({ logs: [log] })
}
