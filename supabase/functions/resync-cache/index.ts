import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { authenticateUser, initSupabaseClients } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, handleError, successResponse } from '../_shared/errors.ts'

const WEBHOOK_URL = Deno.env.get('WEBHOOK_URL')!
const WEBHOOK_TOKEN = Deno.env.get('WEBHOOK_TOKEN')!

type ResyncOptions = {
	apiKeys?: boolean
	projects?: boolean
}

Deno.serve(async (req) => {
	// Handle CORS preflight
	if (req.method === 'OPTIONS') {
		return handleCors()
	}

	// // Only allow POST
	// if (req.method !== 'POST') {
	// 	return errorResponse('Method not allowed', 405)
	// }

	try {
		// Validate required environment variables
		if (!WEBHOOK_URL || !WEBHOOK_TOKEN) {
			console.error('[Resync] Missing required environment variables', {
				hasWebhookUrl: !!WEBHOOK_URL,
				hasWebhookToken: !!WEBHOOK_TOKEN
			})
			return errorResponse('Configuration error: Missing required environment variables', 500)
		}

		// // Authenticate user (must be authenticated to trigger resync)
		// await authenticateUser(req)
		const { supabaseAdmin } = initSupabaseClients()

		// Parse options (default to resyncing everything)
		const body = await req.json().catch(() => ({}))
		const options: ResyncOptions = {
			apiKeys: body.apiKeys !== false,
			projects: body.projects !== false
		}

		const results = {
			apiKeys: { synced: 0, failed: 0 },
			projects: { synced: 0, failed: 0 }
		}

		// Resync API keys
		if (options.apiKeys) {
			console.log('[Resync] Fetching all API keys...')
			const { data: apiKeys, error: apiKeysError } = await supabaseAdmin
				.from('api_keys')
				.select('*')

			if (apiKeysError) {
				console.error('[Resync] Failed to fetch API keys:', apiKeysError)
				throw new Error('Failed to fetch API keys')
			}

			console.log(`[Resync] Found ${apiKeys?.length || 0} API keys`)

			// Trigger webhook for each API key in parallel
			const apiKeyPromises = (apiKeys || []).map(async (apiKey) => {
				try {
					await fetch(WEBHOOK_URL, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'x-webhook-token': WEBHOOK_TOKEN
						},
						body: JSON.stringify({
							table: 'api_keys',
							operation: 'UPDATE',
							new_row: apiKey,
							old_row: apiKey,
							timestamp: new Date().toISOString()
						})
					})
					return { success: true, id: apiKey.id }
				} catch (error) {
					console.error(`[Resync] Failed to sync API key ${apiKey.id}:`, error)
					return { success: false, id: apiKey.id }
				}
			})

			const apiKeyResults = await Promise.allSettled(apiKeyPromises)
			apiKeyResults.forEach((result) => {
				if (result.status === 'fulfilled' && result.value.success) {
					results.apiKeys.synced++
				} else {
					results.apiKeys.failed++
				}
			})
		}

		// Resync projects
		if (options.projects) {
			console.log('[Resync] Fetching all projects...')
			const { data: projects, error: projectsError } = await supabaseAdmin
				.from('projects')
				.select('*')

			if (projectsError) {
				console.error('[Resync] Failed to fetch projects:', projectsError)
				throw new Error('Failed to fetch projects')
			}

			console.log(`[Resync] Found ${projects?.length || 0} projects`)

			// Trigger webhook for each project in parallel
			const projectPromises = (projects || []).map(async (project) => {
				try {
					await fetch(WEBHOOK_URL, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'x-webhook-token': WEBHOOK_TOKEN
						},
						body: JSON.stringify({
							table: 'projects',
							operation: 'UPDATE',
							new_row: project,
							old_row: project,
							timestamp: new Date().toISOString()
						})
					})
					return { success: true, id: project.id }
				} catch (error) {
					console.error(`[Resync] Failed to sync project ${project.id}:`, error)
					return { success: false, id: project.id }
				}
			})

			const projectResults = await Promise.allSettled(projectPromises)
			projectResults.forEach((result) => {
				if (result.status === 'fulfilled' && result.value.success) {
					results.projects.synced++
				} else {
					results.projects.failed++
				}
			})
		}

		console.log('[Resync] Completed:', results)

		return successResponse({
			message: 'Cache resync completed',
			results
		})
	} catch (error) {
		return handleError(error)
	}
})
