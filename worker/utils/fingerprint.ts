import { type DeviceFingerprint } from '../types'

import { sha256Hex } from './crypto'

export async function generateFingerprintHash(fingerprint: DeviceFingerprint): Promise<string> {
	// Combine signals into a stable string
	const signals = [
		fingerprint.userAgent || '',
		fingerprint.screen || '',
		fingerprint.timezone || '',
		fingerprint.canvas ?? '',
		fingerprint.webgl ?? '',
		(fingerprint.fonts ?? []).sort().join(','),
		fingerprint.touchSupport?.toString() ?? '',
		fingerprint.cpuCores?.toString() ?? '',
		fingerprint.deviceMemory?.toString() ?? ''
	].join('|')

	const hashHex = await sha256Hex(signals)

	return `fp_${hashHex.substring(0, 32)}`
}
