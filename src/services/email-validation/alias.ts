export function detectAliasPattern(email: string, localPart: string): boolean {
	// Gmail-style aliases: user+something@gmail.com
	if (localPart.includes('+')) {
		return true
	}

	// TODO: Keep or remove?
	// Detect numeric suffixes: user1, user2, user3
	// if (/\d+$/.test(localPart)) {
	// 	return true
	// }

	// TODO: Keep or remove?
	// Gmail dots (technically not aliases but often used as such)
	// user.name@gmail.com vs username@gmail.com
	// const domain = email.split('@')[1].toLowerCase()
	// return domain === 'gmail.com' && localPart.includes('.')

	return false
}
