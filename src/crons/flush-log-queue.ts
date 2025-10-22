// Flush all LogQueue Durable Object instances.
// We enumerate known projects from PROJECT_SETTINGS KV (keys like `project:<projectId>`) and
// dispatch a flush to each project's LogQueue instance (named by projectId).
import { flushLogs } from '../kv'

export async function flushAllLogQueues(env: Env): Promise<void> {
	try {
		// List project settings keys to discover active project IDs
		const list = await env.PROJECT_SETTINGS.list({ prefix: 'project:' })
		const projectIds = list.keys
			.map((k) => k.name)
			.filter((name) => name.startsWith('project:'))
			.map((name) => name.slice('project:'.length))
			.filter(Boolean)

		for (const projectId of projectIds) {
			await flushLogs(projectId, env)
		}
	} catch (err) {
		console.error('flushAllLogQueues failed:', err)
	}
}
