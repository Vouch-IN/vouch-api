import { type Recommendation, type RiskThresholds } from '../../types'

export function determineRecommendation(riskScore: number, thresholds: RiskThresholds) {
	let recommendation: Recommendation = 'allow'

	if (riskScore >= thresholds.block) recommendation = 'block'
	else if (riskScore >= thresholds.flag) recommendation = 'flag'

	return recommendation
}
