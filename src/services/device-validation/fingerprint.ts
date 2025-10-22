import type { DeviceData } from '../../types'

export async function checkDeviceFingerprint(
	fingerprintHash: string,
	email: string,
	projectId: string,
	ip: null | string,
	env: Env
): Promise<DeviceData> {
	// Get Durable Object stub
	const startStubCreation = performance.now()
	const id = env.FINGERPRINTS.idFromName(fingerprintHash)
	const stub = env.FINGERPRINTS.get(id)
	const stubCreationDuration = performance.now() - startStubCreation

	// Check fingerprint
	const startFetch = performance.now()
	const response = await stub.fetch('https://do/check', {
		body: JSON.stringify({
			email,
			fingerprintHash,
			projectId
		}),
		headers: { 'Content-Type': 'application/json' },
		method: 'POST'
	})
	const fetchDuration = performance.now() - startFetch

	const startParse = performance.now()
	const deviceData: DeviceData = await response.json()
	const parseDuration = performance.now() - startParse

	console.log(`Worker->DO check: stubCreation: ${stubCreationDuration}ms, fetchDuration: ${fetchDuration}ms, parseDuration: ${parseDuration}ms, total: ${stubCreationDuration + fetchDuration + parseDuration}ms`)

	// Record signup (async, non-blocking for response)
	const startRecordFetch = performance.now()
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
		.then(() => {
			const recordFetchDuration = performance.now() - startRecordFetch
			console.log(`Worker->DO record (async): fetchDuration: ${recordFetchDuration}ms`)
		})
		.catch((err: unknown) => {
			console.error('Failed to record signup:', err)
		})

	return deviceData
}
