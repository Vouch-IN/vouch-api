export function validateEmailSyntax(email: string): boolean {
	// Simple but effective RFC5322-like check; acceptable for initial validation
	const re = /^(?!\.)[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
	return re.test(email)
}
