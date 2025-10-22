// Flush all LogQueue Durable Object instances.
// We enumerate known projects from PROJECT_SETTINGS KV (keys like `project:<projectId>`) and
// dispatch a flush to each project's LogQueue instance (named by projectId).
export async function flushAllLogQueues(env: Env): Promise<void> {
	try {
		// List project settings keys to discover active project IDs
		const list = await env.PROJECT_SETTINGS.list({ prefix: 'project:' })
		const projectIds = list.keys
			.map((k) => k.name)
			.filter((name) => name.startsWith('project:'))
			.map((name) => name.slice('project:'.length))
			.filter(Boolean)

		if (projectIds.length === 0) {
			// Fall back to a single global queue (legacy) if no projects found
			await flushOne(env, 'global')
			return
		}

		for (const projectId of projectIds) {
			await flushOne(env, projectId)
		}
	} catch (err) {
		console.error('flushAllLogQueues failed:', err)
	}
}

async function flushOne(env: Env, name: string): Promise<void> {
	try {
		const id = env.LOG_QUEUE.idFromName(name)
		const stub = env.LOG_QUEUE.get(id)
		// DO stubs require an absolute URL; the origin is ignored.
		await stub.fetch('https://do/flush')
	} catch (err) {
		console.error('Failed to flush LogQueue DO for', name, err)
	}
}
