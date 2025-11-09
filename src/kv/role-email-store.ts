/**
 * Role Email KV Store
 * Manages role-based email addresses in dedicated ROLE_EMAILS KV namespace
 * Each role email is stored as a simple key: admin, support, info, etc.
 * 
 * Note: Validation uses direct get() check in role.ts (efficient O(1) lookup).
 * These functions are for admin/management operations only.
 */

/**
 * Add a role email address to KV
 */
export async function addRoleEmail(env: Env, localPart: string): Promise<void> {
	const normalized = localPart.toLowerCase().trim()
	await env.ROLE_EMAILS.put(normalized, '1', {
		metadata: {
			addedAt: new Date().toISOString()
		}
	})
	console.log(`Added role email to KV: ${normalized}`)
}

/**
 * Get all role email addresses from KV (for admin/debug endpoints only)
 * Note: Validation does NOT call this - it uses direct get() check
 */
export async function getRoleEmails(env: Env): Promise<string[]> {
	try {
		const list = await env.ROLE_EMAILS.list()
		return list.keys.map(key => key.name)
	} catch (error) {
		console.error('Failed to list role emails from KV:', error)
		return []
	}
}

/**
 * Remove a role email address from KV
 */
export async function removeRoleEmail(env: Env, localPart: string): Promise<void> {
	const normalized = localPart.toLowerCase().trim()
	await env.ROLE_EMAILS.delete(normalized)
	console.log(`Removed role email from KV: ${normalized}`)
}

/**
 * Bulk set role email addresses
 * Removes all existing role emails and adds the new ones
 */
export async function setRoleEmails(env: Env, roleEmails: string[]): Promise<void> {
	try {
		// Get all existing role email keys for deletion
		const existing = await env.ROLE_EMAILS.list()
		
		// Delete all existing role emails
		await Promise.all(existing.keys.map(key => env.ROLE_EMAILS.delete(key.name)))
		
		// Add new role emails
		await Promise.all(roleEmails.map(email => addRoleEmail(env, email)))
		
		console.log(`Updated role emails in KV: ${roleEmails.length} addresses`)
	} catch (error) {
		console.error('Failed to update role emails in KV:', error)
		throw error
	}
}

