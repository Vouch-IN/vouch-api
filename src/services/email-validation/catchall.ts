import { verifySMTP } from './smtp'

export async function detectCatchAll(domainPart: string, env: Env): Promise<boolean> {
	// Test with a random non-existent email at the same domain
	const randomEmail = `vouch-test-${Math.random().toString(36).substring(7)}@${domainPart}`

	// If the random email also passes SMTP verification, it's likely a catch-all
	return await verifySMTP(randomEmail, env)
}
