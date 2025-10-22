import { DurableObject } from 'cloudflare:workers'

import type { DeviceData } from '../types'
import { errorResponse, jsonResponse } from '../utils'

type CheckFingerprintRequest = {
	email: string
	fingerprintHash: string
	projectId: string
}

type FingerprintData = {
	emailsUsed: string[]
	fingerprintHash: string
	firstSeen: number
	lastIP: null | string
	lastSeen: number
	projectsSeen: string[]
	signupCount: number
}

type RecordSignupRequest = {
	email: string
	fingerprintHash: string
	ip: null | string
	projectId: string
}

export class FingerprintStore extends DurableObject {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url)

		if (url.pathname === '/check') {
			return this.checkFingerprint(request)
		}

		if (url.pathname === '/record') {
			return this.recordSignup(request)
		}

		return errorResponse('not_found', '404 Not Found', 404)
	}

	private async checkFingerprint(request: Request): Promise<Response> {
		const startTotal = performance.now()

		const startParse = performance.now()
		const body: CheckFingerprintRequest = await request.json()
		const parseDuration = performance.now() - startParse

		const { email, fingerprintHash } = body

		const startGet = performance.now()
		const data = await this.ctx.storage.get<FingerprintData>(fingerprintHash)
		const getDuration = performance.now() - startGet

		const totalDuration = performance.now() - startTotal

		console.log(`FingerprintStore check latency: parseDuration: ${parseDuration}ms, getDuration: ${getDuration}ms, total: ${totalDuration}ms`)

		if (!data) {
			return jsonResponse({
				emailsUsed: 0,
				firstSeen: Date.now(),
				isKnownDevice: false,
				isNewEmail: false,
				previousSignups: 0
			} satisfies DeviceData)
		}

		const isNewEmail = !data.emailsUsed.includes(email)

		return jsonResponse({
			emailsUsed: data.emailsUsed.length,
			firstSeen: data.firstSeen,
			isKnownDevice: true,
			isNewEmail,
			lastSeen: data.lastSeen,
			previousSignups: data.signupCount
		} satisfies DeviceData)
	}

	private async recordSignup(request: Request): Promise<Response> {
		const startTotal = performance.now()

		const startParse = performance.now()
		const body: RecordSignupRequest = await request.json()
		const parseDuration = performance.now() - startParse

		const { email, fingerprintHash, ip, projectId } = body

		const startGet = performance.now()
		let data = await this.ctx.storage.get<FingerprintData>(fingerprintHash)
		const getDuration = performance.now() - startGet

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

 	const startPut = performance.now()
 	await this.ctx.storage.put(fingerprintHash, data)
 	const putDuration = performance.now() - startPut

 	const totalDuration = performance.now() - startTotal

 	console.log(`FingerprintStore record latency: parseDuration: ${parseDuration}ms, getDuration: ${getDuration}ms, putDuration: ${putDuration}ms, total: ${totalDuration}ms`)

 	return jsonResponse({ success: true })
	}
}
