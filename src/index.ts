import { flushAllLogQueues, syncDisposableDomains } from './crons'
import { handleHealth, handleValidation, handleWebhook } from './handlers'
import {
	handleDebugAddRoleEmail,
	handleDebugFlushLogs,
	handleDebugFlushUsages,
	handleDebugGetRoleEmails,
	handleDebugKvDelete,
	handleDebugKvGet,
	handleDebugKvList,
	handleDebugRemoveRoleEmail,
	handleDebugSetRoleEmails,
	handleDebugSyncDomains
} from './handlers/debug'
import { handleError } from './middleware'

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

			if (env.ENVIRONMENT === 'development') {
				if (url.pathname === '/debug/kv/list') {
					return await handleDebugKvList(request, env)
				}
				if (url.pathname === '/debug/kv/get') {
					return await handleDebugKvGet(request, env)
				}
				if (url.pathname === '/debug/kv/delete') {
					return await handleDebugKvDelete(request, env)
				}
				if (url.pathname === '/debug/sync-domains') {
					return await handleDebugSyncDomains(request, env)
				}
				if (url.pathname === '/debug/flush-logs') {
					return await handleDebugFlushLogs(request, env)
				}
				if (url.pathname === '/debug/flush-usages') {
					return await handleDebugFlushUsages(request, env)
				}
				if (url.pathname === '/debug/role-emails' || url.pathname === '/debug/role-emails/get') {
					return await handleDebugGetRoleEmails(request, env)
				}
				if (url.pathname === '/debug/role-emails/add') {
					return await handleDebugAddRoleEmail(request, env)
				}
				if (url.pathname === '/debug/role-emails/remove') {
					return await handleDebugRemoveRoleEmail(request, env)
				}
				if (url.pathname === '/debug/role-emails/set') {
					return await handleDebugSetRoleEmails(request, env)
				}
			}

			return new Response('Not found', { status: 404 })
		} catch (error) {
			return handleError(error)
		}
	},
	async scheduled(controller: ScheduledController, env: Env): Promise<void> {
		try {
			const cron = controller.cron

			// Run log flush every hour
			if (cron === '0 * * * *') {
				await flushAllLogQueues(env)
			}

			// Run disposable domain sync daily at 2am UTC
			if (cron === '0 2 * * *') {
				await syncDisposableDomains(env)
			}
		} catch (error) {
			console.error('Scheduled job failed:', error)
		}
	}
}
