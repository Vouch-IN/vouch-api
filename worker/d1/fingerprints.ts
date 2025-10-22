import { type DeviceData } from '../types'
import { safeParse, safeStringify } from '../utils'

type FingerprintDbRow = {
	emails_used: string
	first_seen: number
	hash: string
	last_ip: null | string
	last_seen: number
	projects_seen: string
	signup_count: number
}

type FingerprintRequestInput = {
	email: string
	fingerprintHash: string
	ip: null | string
	projectId: string
}

export async function checkFingerprintAndRecordSignup({ email, fingerprintHash, ip, projectId }: FingerprintRequestInput, env: Env) {
	const session = env.vouch_db.withSession()
	// Check if fingerprint exists
	const existing = await session
		.prepare('SELECT emails_used, projects_seen FROM fingerprints WHERE hash = ?')
		.bind(fingerprintHash)
		.first<FingerprintDbRow>()

	const now = Date.now()

	if (!existing) {
		const deviceData: DeviceData = {
			emailsUsed: 0,
			firstSeen: now,
			isKnownDevice: false,
			isNewEmail: true,
			previousSignups: 0
		}
		// Insert new fingerprint
		await session
			.prepare(
				`INSERT INTO fingerprints
        (hash, emails_used, projects_seen, signup_count, first_seen, last_seen, last_ip)
        VALUES (?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(fingerprintHash, safeStringify([email]), safeStringify([projectId]), 1, now, now, ip)
			.run()

		return deviceData
	} else {
		const emailsUsed = safeParse<string[]>(existing.emails_used, [])
		const projectsSeen = safeParse<string[]>(existing.projects_seen, [])

		const deviceData: DeviceData = {
			emailsUsed: emailsUsed.length,
			firstSeen: existing.first_seen,
			isKnownDevice: true,
			isNewEmail: false,
			previousSignups: existing.signup_count
		}

		if (!emailsUsed.includes(email)) emailsUsed.push(email)
		if (!projectsSeen.includes(projectId)) projectsSeen.push(projectId)

		await session
			.prepare(
				`UPDATE fingerprints
        SET emails_used = ?,
            projects_seen = ?,
            signup_count = ?,
            last_seen = ?,
            last_ip = ?
        WHERE hash = ?`
			)
			.bind(safeStringify(emailsUsed), safeStringify(projectsSeen), existing.signup_count + 1, now, existing.last_ip || ip, fingerprintHash)
			.run()

		return deviceData
	}
}
