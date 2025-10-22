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

	// Check fingerprint
	const response = await stub.fetch('https://do/check', {
		body: JSON.stringify({
			email,
			fingerprintHash,
			projectId
		}),
		headers: { 'Content-Type': 'application/json' },
		method: 'POST'
	})

	const deviceData: DeviceData = await response.json()

	// Record signup (async, non-blocking for response)
	stub
		.fetch('https://do/record', {
			body: JSON.stringify({
				email,
				fingerprintHash,
				ip,
				projectId
			}),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST'
		})
		.catch((err: unknown) => {
			console.error('Failed to record signup:', err)
		})

	return deviceData
}
