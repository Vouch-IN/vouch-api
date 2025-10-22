import { Redis } from '@upstash/redis/cloudflare'

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
	const redis = Redis.fromEnv(env)
	const key = `fp:${fingerprintHash}`
	const data = await redis.hgetall<FingerprintData>(key)

	const now = Date.now()

	if (!data || Object.keys(data).length === 0) {
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

		redis.hset(key, fingerprintData).catch((error: unknown) => {
			console.log('Error while updating fingerprint', error)
		})

		return deviceData
	} else {
		const deviceData: DeviceData = {
			emailsUsed: data.emailsUsed.length,
			firstSeen: data.firstSeen,
			isKnownDevice: true,
			isNewEmail: data.emailsUsed.includes(email),
			previousSignups: data.signupCount
		}
		if (!data.emailsUsed.includes(email)) {
			data.emailsUsed.push(email)
		}
		if (!data.projectsSeen.includes(projectId)) {
			data.projectsSeen.push(projectId)
		}
		if (ip) {
			data.lastIP = ip
		}
		data.signupCount++
		data.lastSeen = now

		redis.hset(key, data).catch((error: unknown) => {
			console.log('Error while updating fingerprint', error)
		})

		return deviceData
	}
}
