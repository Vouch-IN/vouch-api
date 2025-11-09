import { withTimeout } from '../../utils'

/**
 * Verify SMTP/mailbox deliverability
 *
 * IMPORTANT: True SMTP verification requires TCP connections not available in Cloudflare Workers.
 * This implementation uses enhanced DNS-based validation as a proxy for deliverability:
 *
 * - Checks for SPF records (indicates legitimate mail server configuration)
 * - Returns false only if domain explicitly has no SPF record
 * - Otherwise fails open (returns true) to avoid false negatives
 *
 * For true SMTP verification, consider integrating a third-party service like:
 * MailboxValidator, ZeroBounce, AbstractAPI, or Kickbox
 *
 * @param email - Email address to verify
 * @param env - Worker environment with bindings
 * @returns true if email appears deliverable, false if definitely not deliverable
 */
export async function verifySMTP(email: string, env: Env): Promise<boolean> {
	try {
		// Enhanced DNS-based validation
		// This checks for proper email infrastructure beyond basic MX
		const [, domain] = email.split('@')
		if (!domain) return false

		// Check for SPF record (indicates legitimate mail server)
		const hasSPF = await checkSPFRecord(domain)
		if (hasSPF === false) {
			// No SPF record - potentially suspicious
			return false
		}

		// Fail open (default)
		// Return true to avoid blocking valid emails
		// Rely on other checks (MX, disposable, etc.) for validation
		return true
	} catch (error) {
		console.error('SMTP verification error:', error)
		return true // Fail open on errors
	}
}

/**
 * Check if domain has SPF record (basic email authentication)
 * SPF presence indicates a legitimate mail server configuration
 */
async function checkSPFRecord(domain: string): Promise<boolean | null> {
	try {
		const response = await withTimeout(
			fetch(
				`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`,
				{ method: 'GET' }
			),
			600
		)

		if (!response.ok) return null

		const data = await response.json() as { Answer?: Array<{ data: string }> }

		// Check if any TXT record contains SPF configuration
		const hasSPF = data.Answer?.some((record) =>
			record.data && typeof record.data === 'string' && record.data.includes('v=spf1')
		) ?? false

		return hasSPF
	} catch {
		return null // DNS check failed
	}
}
