import { flushAllLogQueues } from './crons'
import { FingerprintStore, LogQueue, UsageCounter } from './durable-objects'
import { handleHealth, handleValidation, handleWebhook } from './handlers'
import { handleError } from './middleware'

export { FingerprintStore, LogQueue, UsageCounter }

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			const url = new URL(request.url)

			// Health check
			if (url.pathname === '/health') {
				return await handleHealth(request, env)
			}

			// Webhook endpoint (from Supabase)
			if (url.pathname === '/webhook') {
				return await handleWebhook(request, env)
			}

			// Main validation endpoint
			if (url.pathname === '/validate') {
				return await handleValidation(request, env)
			}

			return new Response('Not found', { status: 404 })
		} catch (error) {
			return handleError(error)
		}
	},
	async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
		try {
			await flushAllLogQueues(env)
		} catch (error) {
			console.error('Scheduled flush failed:', error)
		}
	}
}
