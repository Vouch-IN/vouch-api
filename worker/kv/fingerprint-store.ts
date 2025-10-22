import type { DeviceData } from '../types'

type FingerprintData = {
	emailsUsed: string[]
	fingerprintHash: string
	firstSeen: number
	lastIP: null | string
	lastSeen: number
	projectsSeen: string[]
	signupCount: number
}

type FingerprintRequestInput = {
	email: string
	fingerprintHash: string
	ip: null | string
	projectId: string
}

export async function checkFingerprintAndRecordSignup({ email, fingerprintHash, ip, projectId }: FingerprintRequestInput, env: Env) {
	const key = `fp:${fingerprintHash}`
	const existing = await env.FINGERPRINTS.get<FingerprintData>(key, { type: 'json' })

	const now = Date.now()

	if (!existing) {
		const deviceData: DeviceData = {
			emailsUsed: 0,
			firstSeen: now,
			isKnownDevice: false,
			isNewEmail: true,
			previousSignups: 0
		}

		const fingerprintData: FingerprintData = {
			emailsUsed: [email],
			fingerprintHash,
			firstSeen: now,
			lastIP: ip,
			lastSeen: now,
			projectsSeen: [projectId],
			signupCount: 1
		}

		env.FINGERPRINTS.put(key, JSON.stringify(fingerprintData)).catch((error: unknown) => {
			console.log('Error while updating fingerprint', error)
		})

		return deviceData
	} else {
		const deviceData: DeviceData = {
			emailsUsed: existing.emailsUsed.length,
			firstSeen: existing.firstSeen,
			isKnownDevice: true,
			isNewEmail: existing.emailsUsed.includes(email),
			previousSignups: existing.signupCount
		}

		const fingerprintData: FingerprintData = {
			...existing
		}

		if (!fingerprintData.emailsUsed.includes(email)) {
			fingerprintData.emailsUsed.push(email)
		}
		if (!fingerprintData.projectsSeen.includes(projectId)) {
			fingerprintData.projectsSeen.push(projectId)
		}
		if (ip) {
			fingerprintData.lastIP = ip
		}
		fingerprintData.signupCount++
		fingerprintData.lastSeen = now

		env.FINGERPRINTS.put(key, JSON.stringify(fingerprintData)).catch((error: unknown) => {
			console.log('Error while updating fingerprint', error)
		})

		return deviceData
	}
}
