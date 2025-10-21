import { type RiskWeights } from '../../types'

export function calculateRiskScore(signals: string[], riskWeights: RiskWeights) {
	let riskScore = 0

	if (signals.includes('invalid_syntax')) riskScore += riskWeights.invalidSyntax
	if (signals.includes('alias_pattern')) riskScore += riskWeights.alias
	if (signals.includes('disposable_email')) riskScore += riskWeights.disposable
	if (signals.includes('invalid_mx')) riskScore += riskWeights.invalidMx
	if (signals.includes('role_email')) riskScore += riskWeights.roleEmail
	if (signals.includes('smtp_fail')) riskScore += riskWeights.smtpFail
	if (signals.includes('catchall_domain')) riskScore += riskWeights.catchall
	if (signals.includes('vpn_detected')) riskScore += riskWeights.vpnIp
	if (signals.includes('fraud_ip')) riskScore += riskWeights.fraudIp
	if (signals.includes('device_reuse')) riskScore += riskWeights.deviceReuse

	if (signals.includes('whitelisted')) riskScore = 0
	if (signals.includes('blacklisted')) riskScore = 100

	riskScore = Math.min(100, riskScore)

	return riskScore
}
