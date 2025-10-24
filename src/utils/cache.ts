export async function deleteCachedData(key: string, env: Env): Promise<void> {
	await env.PROJECT_SETTINGS.delete(key)
}

export async function getCachedData<T>(key: string, env: Env): Promise<null | T> {
	return await env.PROJECT_SETTINGS.get<T>(key, { type: 'json' })
}

export async function setCacheData(
	key: string,
	data: unknown,
	env: Env,
	ttlSeconds = 3600
): Promise<void> {
	await env.PROJECT_SETTINGS.put(key, JSON.stringify(data), { expirationTtl: ttlSeconds })
}
