import { type RiskWeights } from '../types'

export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
	alias: 25,
	catchall: 20,
	deviceReuse: 35,
	disposable: 40,
	fraudIp: 30,
	invalidMx: 15,
	invalidSyntax: 100,
	roleEmail: 10,
	smtpFail: 10,
	vpnIp: 10
}
