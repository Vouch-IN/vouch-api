import { withTimeout } from '../../utils'

export async function checkDisposableEmail(domainPart: string, env: Env): Promise<boolean> {
	const domainsList =
		(await withTimeout(
			env.DISPOSABLE_DOMAINS.get<string[]>('domains:list', { type: 'json' }),
			400
		)) ?? []
	return domainsList.includes(domainPart)
}
