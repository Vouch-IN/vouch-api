import { createClient } from '../../lib/supabase'

export async function updateApiKeyLastUsed(apiKeyId: string, env: Env): Promise<void> {
	try {
		const client = createClient(env)

		const { error } = await client
			.from('api_keys')
			.update({ last_used_at: new Date().toISOString() })
			.eq('id', apiKeyId)

		if (error) {
			console.error('Failed to update API key last_used_at:', error.message)
		}
	} catch (err) {
		console.error('Unexpected error updating API key:', err)
	}
}
