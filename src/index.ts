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
import { createLogger } from './utils'

const logger = createLogger({ service: 'worker' })

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			const url = new URL(request.url)
			logger.debug('Request received', { path: url.pathname, method: request.method })

			// Health check (v1)
			if (url.pathname === '/v1/health') {
				return await handleHealth(request, env)
			}

			// Health check (always latest version)
			if (url.pathname === '/health') {
				return await handleHealth(request, env)
			}

			// Webhook endpoint (from Supabase) (v1)
			if (url.pathname === '/v1/webhook') {
				return await handleWebhook(request, env)
			}

			// Webhook endpoint (from Supabase) (always latest version)
			if (url.pathname === '/webhook') {
				return await handleWebhook(request, env)
			}

			// Main validation endpoint (v1)
			if (url.pathname === '/v1/validate') {
				return await handleValidation(request, env)
			}

			// Main validation endpoint (always latest version)
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

			logger.warn('Route not found', { path: url.pathname })
			return new Response('Not found', { status: 404 })
		} catch (error) {
			return handleError(error)
		}
	},
	async scheduled(controller: ScheduledController, env: Env): Promise<void> {
		const cronLogger = logger.child({ cron: controller.cron })
		try {
			const cron = controller.cron

			// Run log flush every hour
			if (cron === '0 * * * *') {
				cronLogger.info('Starting log flush cron job')
				await flushAllLogQueues(env)
				cronLogger.info('Log flush cron job completed')
			}

			// Run disposable domain sync daily at 2am UTC
			if (cron === '0 2 * * *') {
				cronLogger.info('Starting disposable domain sync cron job')
				await syncDisposableDomains(env)
				cronLogger.info('Disposable domain sync cron job completed')
			}
		} catch (error) {
			cronLogger.error('Scheduled job failed', error)
		}
	}
}
