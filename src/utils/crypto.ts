export async function encrypt(dataStr: string, projectId: string, env: Env): Promise<string> {
	const key = await getEncryptionKey(projectId, env)
	const encoder = new TextEncoder()
	const data = encoder.encode(dataStr)

	const iv = crypto.getRandomValues(new Uint8Array(12))

	const encryptedData = await crypto.subtle.encrypt({ iv, name: 'AES-GCM' }, key, data)

	// Combine IV and encrypted data
	const combined = new Uint8Array(iv.length + encryptedData.byteLength)
	combined.set(iv)
	combined.set(new Uint8Array(encryptedData), iv.length)

	// Base64 encode
	return btoa(String.fromCharCode(...combined))
}

/**
 * Hash email or api key string using SHA-256 and return hex string
 */
export async function sha256Hex(dataStr: string): Promise<string> {
	const encoder = new TextEncoder()
	const data = encoder.encode(dataStr)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function getEncryptionKey(projectId: string, env: Env): Promise<CryptoKey> {
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(env.ENCRYPTION_KEY),
		{ name: 'PBKDF2' },
		false,
		['deriveBits', 'deriveKey']
	)

	return crypto.subtle.deriveKey(
		{
			hash: 'SHA-256',
			iterations: 100000,
			name: 'PBKDF2',
			salt: new TextEncoder().encode(projectId)
		},
		keyMaterial,
		{ length: 256, name: 'AES-GCM' },
		false,
		['encrypt', 'decrypt']
	)
}
