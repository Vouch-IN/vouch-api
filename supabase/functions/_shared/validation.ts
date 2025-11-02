/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validate project role
 */
export function isValidRole(role: string): boolean {
	return ['admin', 'member'].includes(role)
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)
}

/**
 * Validate required fields exist
 */
export function validateRequired(data: Record<string, any>, fields: string[]) {
	const missing = fields.filter((field) => !data[field])
	if (missing.length > 0) {
		throw new Error(`Missing required fields: ${missing.join(', ')}`)
	}
}
