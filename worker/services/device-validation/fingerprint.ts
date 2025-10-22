import type { DeviceData } from '../../types'

export async function checkDeviceFingerprint(
	fingerprintHash: string,
	email: string,
	projectId: string,
	ip: null | string,
	env: Env
): Promise<DeviceData> {
	// Get Durable Object stub
	const id = env.FINGERPRINTS.idFromName(fingerprintHash)
	const stub = env.FINGERPRINTS.get(id)

	return stub.checkAndRecord({
		email,
		fingerprintHash,
		ip,
		projectId
	})
}
