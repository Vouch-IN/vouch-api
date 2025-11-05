import { withTimeout } from '../../utils'

/**
 * Check if the email local part is a role-based email address
 * Directly checks the dedicated ROLE_EMAILS KV namespace
 * @param localPart - The part before @ in the email address
 * @param env - Cloudflare Worker environment with KV bindings
 * @returns true if the local part matches a role email address
 */
export async function detectRoleEmail(localPart: string, env: Env): Promise<boolean> {
	try {
		const normalizedLocalPart = localPart.toLowerCase().trim()
		// Check if key exists in dedicated ROLE_EMAILS KV namespace
		const exists = await withTimeout(
			env.ROLE_EMAILS.get(normalizedLocalPart),
			300
		)
		return exists !== null
	} catch (error) {
		// If KV check fails, return false (don't block validation)
		console.error('Failed to check role email in KV:', error)
		return false
	}
}
