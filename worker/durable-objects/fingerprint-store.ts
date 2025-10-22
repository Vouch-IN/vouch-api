import { DurableObject } from 'cloudflare:workers'

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

type RequestInput = {
	email: string
	fingerprintHash: string
	ip: null | string
	projectId: string
}

export class FingerprintStore extends DurableObject<Env> {
	async check({ email, fingerprintHash }: RequestInput): Promise<DeviceData> {
		const data = await this.ctx.storage.get<FingerprintData>(fingerprintHash)

		if (!data) {
			return {
				emailsUsed: 0,
				firstSeen: Date.now(),
				isKnownDevice: false,
				isNewEmail: false,
				previousSignups: 0
			} satisfies DeviceData
		}

		const isNewEmail = !data.emailsUsed.includes(email)

		return {
			emailsUsed: data.emailsUsed.length,
			firstSeen: data.firstSeen,
			isKnownDevice: true,
			isNewEmail,
			lastSeen: data.lastSeen,
			previousSignups: data.signupCount
		} satisfies DeviceData
	}

	async checkAndRecord(request: RequestInput) {
		const deviceData = await this.check(request)

		this.record(request).catch((error: unknown) => {
			console.error('Failed to record signup:', error)
		})

		return deviceData
	}

	async record({ email, fingerprintHash, ip, projectId }: RequestInput): Promise<FingerprintData> {
		let data = await this.ctx.storage.get<FingerprintData>(fingerprintHash)

		if (!data) {
			data = {
				emailsUsed: [email],
				fingerprintHash,
				firstSeen: Date.now(),
				lastIP: ip,
				lastSeen: Date.now(),
				projectsSeen: [projectId],
				signupCount: 1
			}
		} else {
			if (!data.emailsUsed.includes(email)) {
				data.emailsUsed.push(email)
			}
			if (!data.projectsSeen.includes(projectId)) {
				data.projectsSeen.push(projectId)
			}
			data.signupCount++
			data.lastSeen = Date.now()
			data.lastIP = ip
		}

		await this.ctx.storage.put(fingerprintHash, data)

		return data
	}
}
