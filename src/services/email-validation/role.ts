export function detectRoleEmail(localPart: string): boolean {
	const roleAddresses = [
		'admin',
		'info',
		'support',
		'sales',
		'contact',
		'help',
		'webmaster',
		'postmaster',
		'abuse',
		'noreply',
		'no-reply',
		'marketing',
		'billing',
		'accounts',
		'team',
		'hello'
	]

	return roleAddresses.includes(localPart)
}
