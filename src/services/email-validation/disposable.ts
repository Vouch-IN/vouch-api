import { withTimeout } from '../../utils'

export async function checkDisposableEmail(domainPart: string, env: Env): Promise<boolean> {
	// Direct KV lookup - domain exists as key if it's disposable
	const result = await withTimeout(
		env.DISPOSABLE_DOMAINS.get(domainPart.toLowerCase()),
		400
	)
	return result !== null
}
