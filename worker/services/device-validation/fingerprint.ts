import { checkFingerprintAndRecordSignup } from '../../kv'
import type { DeviceData } from '../../types'

export async function checkDeviceFingerprint(
	fingerprintHash: string,
	email: string,
	projectId: string,
	ip: null | string,
	env: Env
): Promise<DeviceData> {
	return checkFingerprintAndRecordSignup(
		{
			email,
			fingerprintHash,
			ip,
			projectId
		},
		env
	)
}
