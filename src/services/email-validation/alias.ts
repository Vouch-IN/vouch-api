export function detectAliasPattern(email: string, localPart: string): boolean {
	const domain = email.split('@')[1]?.toLowerCase()

	// Gmail/Googlemail: flag both + and . (Gmail ignores both for routing)
	if (domain === 'gmail.com' || domain === 'googlemail.com') {
		return localPart.includes('+') || localPart.includes('.')
	}

	// Other providers: only flag + addressing
	// Dots are usually legitimate (e.g., john.doe@company.com)
	return localPart.includes('+')
}
