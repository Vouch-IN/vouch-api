import { type DeviceData } from '../types'
import { safeParse, safeStringify } from '../utils'

type FingerprintData = {
	emailsUsed: string[]
	fingerprintHash: string
	firstSeen: number
	lastIP: null | string
	lastSeen: number
	projectsSeen: string[]
	signupCount: number
}

type FingerprintDbRow = {
	emails_used: string
	first_seen: number
	hash: string
	last_ip: null | string
	last_seen: number
	projects_seen: string
	signup_count: number
}

type RequestInput = {
	email: string
	fingerprintHash: string
	ip: null | string
	projectId: string
}

export async function checkFingerprint({ email, fingerprintHash }: RequestInput, env: Env): Promise<DeviceData> {
	const data = await env.vouch_db.prepare('SELECT * FROM fingerprints WHERE hash = ?').bind(fingerprintHash).first<FingerprintDbRow>()

	if (!data) {
		return {
			emailsUsed: 0,
			firstSeen: Date.now(),
			isKnownDevice: false,
			isNewEmail: false,
			previousSignups: 0
		} satisfies DeviceData
	}

	const emailsUsedArray = safeParse<string[]>(data.emails_used, [])

	const isNewEmail = !emailsUsedArray.includes(email)

	return {
		emailsUsed: emailsUsedArray.length,
		firstSeen: data.first_seen,
		isKnownDevice: true,
		isNewEmail,
		lastSeen: data.last_seen,
		previousSignups: data.signup_count
	} satisfies DeviceData
}

export async function checkFingerprintAndRecordSignup(request: RequestInput, env: Env) {
	const deviceData = await checkFingerprint(request, env)

	recordSignup(request, env).catch((error: unknown) => {
		console.error('Failed to record signup:', error)
	})

	return deviceData
}

export async function recordSignup({ email, fingerprintHash, ip, projectId }: RequestInput, env: Env): Promise<FingerprintData> {
	// Check if fingerprint exists
	const existing = await env.vouch_db
		.prepare('SELECT emails_used, projects_seen FROM fingerprints WHERE hash = ?')
		.bind(fingerprintHash)
		.first<FingerprintDbRow>()

	const now = Date.now()

	if (!existing) {
		const data: FingerprintData = {
			emailsUsed: [email],
			fingerprintHash,
			firstSeen: now,
			lastIP: ip,
			lastSeen: now,
			projectsSeen: [projectId],
			signupCount: 1
		}

		// Insert new fingerprint
		await env.vouch_db
			.prepare(
				`INSERT INTO fingerprints
        (hash, emails_used, projects_seen, signup_count, first_seen, last_seen, last_ip)
        VALUES (?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				data.fingerprintHash,
				safeStringify(data.emailsUsed),
				safeStringify(data.projectsSeen),
				data.signupCount,
				data.firstSeen,
				data.lastSeen,
				data.lastIP
			)
			.run()

		return data
	} else {
		const data: FingerprintData = {
			emailsUsed: safeParse(existing.emails_used, []),
			fingerprintHash: existing.hash,
			firstSeen: existing.first_seen,
			lastIP: existing.last_ip,
			lastSeen: existing.last_seen,
			projectsSeen: safeParse(existing.projects_seen, []),
			signupCount: existing.signup_count
		}

		if (!data.emailsUsed.includes(email)) data.emailsUsed.push(email)
		if (!data.projectsSeen.includes(projectId)) data.projectsSeen.push(projectId)
		if (ip) data.lastIP = ip
		data.lastSeen = now
		data.signupCount++

		await env.vouch_db
			.prepare(
				`UPDATE fingerprints
        SET emails_used = ?,
            projects_seen = ?,
            signup_count = ?,
            last_seen = ?,
            last_ip = ?
        WHERE hash = ?`
			)
			.bind(
				safeStringify(data.emailsUsed),
				safeStringify(data.projectsSeen),
				data.signupCount,
				data.lastSeen,
				data.lastIP,
				data.fingerprintHash
			)
			.run()

		return data
	}
}
