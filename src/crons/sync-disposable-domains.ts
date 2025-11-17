import pAll from 'p-all'
import pRetry from 'p-retry'

import { createClient } from '../lib/supabase'
import { jsonResponse } from '../utils'

// Constants
const R2_FILE_KEY = 'disposable-domains.txt'
const KV_BULK_BATCH_SIZE = 10000 // Cloudflare bulk API limit
const MAX_KV_OPERATIONS = 900 // Stay under 1000 subrequest limit with buffer

// Type for Cloudflare KV Bulk API response
type CloudflareKVBulkResponse = {
	errors: { message: string }[]
	result?: {
		successful_key_count?: number
		unsuccessful_keys?: string[]
	}
	success: boolean
}

const sources = [
	'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf',
	'https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt',
	'https://raw.githubusercontent.com/ivolo/disposable-email-domains/master/index.json',
	'https://raw.githubusercontent.com/FGRibreau/mailchecker/refs/heads/master/list.txt',
	'https://gist.githubusercontent.com/adamloving/4401361/raw/e81212c3caecb54b87ced6392e0a0de2b6466287/temporary-email-address-domains'
]

/**
 * Initial sync function - Run this ONCE to populate KV and R2 with all domains
 * Uses Cloudflare bulk API to insert all domains efficiently
 */
export async function initDisposableDomains(env: Env): Promise<Response> {
	console.log('Starting INITIAL disposable domain sync...')
	let results: Record<string, unknown> = {}

	const client = createClient(env)

	// Check if already initialized
	try {
		const r2Object = await env.SYNC_DATA.get(R2_FILE_KEY)
		if (r2Object) {
			const errorMsg = 'R2 cache already exists. Use syncDisposableDomains for updates.'
			console.error(errorMsg)
			return jsonResponse({ error: errorMsg, success: false }, 400)
		}
	} catch (_) {
		console.log('No R2 cache found - proceeding with initial sync')
	}

	try {
		// Fetch from all sources in parallel
		console.log(`Fetching from ${sources.length} sources...`)
		const responses = await Promise.allSettled(
			sources.map((url) => fetch(url).then((r) => r.text()))
		)

		// Parse and merge
		const allDomains = new Set<string>()
		const errorMessages: string[] = []

		for (let i = 0; i < responses.length; i++) {
			const response = responses[i]
			if (response.status === 'fulfilled') {
				try {
					// Try JSON first
					const json = JSON.parse(response.value) as string[]
					if (Array.isArray(json)) {
						json.forEach((d) => allDomains.add(d.toLowerCase()))
					}
				} catch {
					// Plain text list
					response.value
						.split('\n')
						.map((line) => line.trim())
						.filter((line) => line && !line.startsWith('#'))
						.forEach((domain) => allDomains.add(domain.toLowerCase()))
				}
				console.log(`Source ${i + 1}: Parsed successfully`)
			} else {
				const errorMsg = (response.reason as Error).message
				errorMessages.push(`Source ${i + 1}: ${errorMsg}`)
				console.warn(`Source ${i + 1} failed:`, errorMsg)
			}
		}

		console.log(`Total unique domains collected: ${allDomains.size}`)

		// Prepare bulk insert using Cloudflare API
		const domainsArray = Array.from(allDomains)
		const totalBatches = Math.ceil(domainsArray.length / KV_BULK_BATCH_SIZE)

		console.log(`Inserting ${allDomains.size} domains in ${totalBatches} batches via bulk API...`)

		// Get credentials from env
		if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
			throw new Error('CF_ACCOUNT_ID and CF_API_TOKEN are required for bulk operations')
		}

		// Get namespace ID (you'll need to add this to env)
		const namespaceId = env.DISPOSABLE_DOMAINS_NAMESPACE_ID
		if (!namespaceId) {
			throw new Error('DISPOSABLE_DOMAINS_NAMESPACE_ID is required')
		}

		let successfulBatches = 0
		let failedBatches = 0

		for (let i = 0; i < totalBatches; i++) {
			const start = i * KV_BULK_BATCH_SIZE
			const end = Math.min(start + KV_BULK_BATCH_SIZE, domainsArray.length)
			const batch = domainsArray.slice(start, end)

			const keyValuePairs = batch.map((domain) => ({
				key: domain,
				value: '1'
			}))

			try {
				const response = await fetch(
					`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/storage/kv/namespaces/${namespaceId}/bulk`,
					{
						body: JSON.stringify(keyValuePairs),
						headers: {
							Authorization: `Bearer ${env.CF_API_TOKEN}`,
							'Content-Type': 'application/json'
						},
						method: 'PUT'
					}
				)

				const result: CloudflareKVBulkResponse = await response.json()

				if (result.success) {
					successfulBatches++
					console.log(
						`Batch ${i + 1}/${totalBatches}: Inserted ${batch.length} domains (${result.result?.successful_key_count ?? batch.length} successful)`
					)
				} else {
					failedBatches++
					console.error(
						`Batch ${i + 1}/${totalBatches} failed:`,
						result.errors.map((e) => e.message).join(', ')
					)
				}
			} catch (error) {
				failedBatches++
				console.error(`Batch ${i + 1}/${totalBatches} error:`, error)
			}
		}

		console.log(`Bulk insert complete: ${successfulBatches} successful, ${failedBatches} failed`)

		// Write to R2
		const sortedDomains = domainsArray.sort()
		const domainsText = sortedDomains.join('\n')
		await env.SYNC_DATA.put(R2_FILE_KEY, domainsText, {
			httpMetadata: {
				contentType: 'text/plain'
			}
		})
		console.log(`Updated R2 cache with ${allDomains.size} domains`)

		// Store metadata
		await env.DISPOSABLE_DOMAINS.put(
			'domains:metadata',
			JSON.stringify({
				initialLoad: true,
				lastSync: Date.now(),
				sources,
				totalDomains: allDomains.size,
				version: `v${new Date().toISOString().substring(0, 10)}`
			})
		)

		// Log to Supabase
		const insertPayload = {
			added_domains: [], // Not tracking individual domains in log for initial load
			domains_added: allDomains.size,
			domains_removed: 0,
			error_message: errorMessages.join('; '),
			removed_domains: [],
			sources,
			success: failedBatches === 0,
			synced_at: new Date().toISOString(),
			total_domains: allDomains.size
		}

		results = insertPayload

		await client.from('disposable_domain_sync_log').insert(insertPayload)

		console.log(`Initial sync complete: ${allDomains.size} domains loaded`)
	} catch (error) {
		console.error('Unexpected initial sync error:', error)

		await client.from('disposable_domain_sync_log').insert({
			added_domains: [],
			domains_added: 0,
			domains_removed: 0,
			error_message: error instanceof Error ? error.message : String(error),
			removed_domains: [],
			sources,
			success: false,
			synced_at: new Date().toISOString(),
			total_domains: 0
		})

		results = { error: error instanceof Error ? error.message : String(error), success: false }
	}

	return jsonResponse(results)
}

/**
 * Incremental sync function - Run this regularly (daily) to update KV with changes
 * Only syncs the diff between current R2 cache and new data
 */
export async function syncDisposableDomains(env: Env): Promise<Response> {
	console.log('Starting incremental disposable domain sync...')
	let results: Record<string, unknown> = {}

	const client = createClient(env)

	try {
		// CRITICAL: Check if R2 cache exists first
		const r2Object = await env.SYNC_DATA.get(R2_FILE_KEY)
		if (!r2Object) {
			const errorMsg =
				'R2 cache not found. Please run initDisposableDomains first to perform initial sync.'
			console.error(errorMsg)
			return jsonResponse({ error: errorMsg, success: false }, 400)
		}

		// Load current cached domains from R2
		const cachedDomains = new Set<string>()
		const text = await r2Object.text()
		text
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.forEach((domain) => cachedDomains.add(domain))
		console.log(`Loaded ${cachedDomains.size} domains from R2 cache`)

		// Fetch from all sources in parallel
		const responses = await Promise.allSettled(
			sources.map((url) => fetch(url).then((r) => r.text()))
		)

		// Parse and merge
		const allDomains = new Set<string>()

		const errorMessages = []

		for (const response of responses) {
			if (response.status === 'fulfilled') {
				try {
					// Try JSON first
					const json = JSON.parse(response.value) as string[]
					if (Array.isArray(json)) {
						json.forEach((d) => allDomains.add(d.toLowerCase()))
					}
				} catch {
					// Plain text list
					response.value
						.split('\n')
						.map((line) => line.trim())
						.filter((line) => line && !line.startsWith('#'))
						.forEach((domain) => allDomains.add(domain.toLowerCase()))
				}
			} else {
				errorMessages.push((response.reason as Error).message)
			}
		}

		// Compute incremental additions/removals compared to cached
		const added = Array.from(allDomains).filter((d) => !cachedDomains.has(d))
		const removed = Array.from(cachedDomains).filter((d) => !allDomains.has(d))

		console.log(`Changes detected: +${added.length} added, -${removed.length} removed`)

		const insertPayload = {
			added_domains: added,
			domains_added: added.length,
			domains_removed: removed.length,
			error_message: '',
			removed_domains: removed,
			sources,
			success: !errorMessages.length,
			synced_at: new Date().toISOString(),
			total_domains: allDomains.size
		}

		results = insertPayload

		// Safety check to abort if too many removals
		if (cachedDomains.size > 1000 && removed.length > cachedDomains.size * 0.1) {
			console.error(`Sync aborted: Removing too many domains: ${removed.length}`)
			await client.from('disposable_domain_sync_log').insert({
				...insertPayload,
				error_message: 'Safety check failed: too many removals',
				success: false
			})
			return jsonResponse(results)
		}

		// ============================================================
		// Update KV store with changes (with limit protection)
		// ============================================================
		const totalKVOperations = added.length + removed.length

		// Check if we exceed the safe limit for KV operations
		if (totalKVOperations > MAX_KV_OPERATIONS) {
			const warningMsg = `Too many KV operations required (${totalKVOperations}). Exceeds safe limit of ${MAX_KV_OPERATIONS}. Skipping KV sync, only updating R2.`
			console.warn(warningMsg)

			insertPayload.error_message = warningMsg
			insertPayload.success = false

			// Still update R2 even if KV is skipped
			const sortedDomains = Array.from(allDomains).sort()
			const domainsText = sortedDomains.join('\n')
			await env.SYNC_DATA.put(R2_FILE_KEY, domainsText, {
				httpMetadata: {
					contentType: 'text/plain'
				}
			})
			console.log(`Updated R2 cache with ${allDomains.size} domains (KV sync skipped)`)

			await client.from('disposable_domain_sync_log').insert(insertPayload)

			return jsonResponse({ ...results, warning: warningMsg })
		}

		// Proceed with KV updates
		const kvOperations: (() => Promise<unknown>)[] = []

		// Helper to create retryable KV operation
		const createKVOperation = (operation: () => Promise<unknown>) => {
			return () =>
				pRetry(operation, {
					onFailedAttempt: (error) => {
						console.warn(
							`KV operation failed (attempt ${error.attemptNumber}/${error.retriesLeft + error.attemptNumber})`
						)
					},
					retries: 3
				})
		}

		// Add new domains to KV (each domain as a separate key)
		added.forEach((domain) => {
			kvOperations.push(createKVOperation(() => env.DISPOSABLE_DOMAINS.put(domain, '1')))
		})

		// Remove old domains from KV
		removed.forEach((domain) => {
			kvOperations.push(createKVOperation(() => env.DISPOSABLE_DOMAINS.delete(domain)))
		})

		// Execute all KV operations with concurrency limit (20 concurrent operations)
		console.log(`Executing ${kvOperations.length} KV operations with concurrency limit...`)

		let failedOpsCount = 0
		await pAll(kvOperations, {
			concurrency: 20,
			stopOnError: false
		}).catch((errors: unknown) => {
			// pAll throws AggregateError if stopOnError is false and there are failures
			if (errors instanceof AggregateError) {
				failedOpsCount = errors.errors.length
				console.warn(`${failedOpsCount} KV operations failed after retries`)
			}
		})

		if (failedOpsCount === 0) {
			console.log(`Successfully completed ${kvOperations.length} KV operations`)
		}

		// Update R2 cache with the new domain list
		const sortedDomains = Array.from(allDomains).sort()
		const domainsText = sortedDomains.join('\n')
		await env.SYNC_DATA.put(R2_FILE_KEY, domainsText, {
			httpMetadata: {
				contentType: 'text/plain'
			}
		})
		console.log(`Updated R2 cache with ${allDomains.size} domains`)

		// Store metadata about the sync
		await env.DISPOSABLE_DOMAINS.put(
			'domains:metadata',
			JSON.stringify({
				changes: {
					added: added.length,
					removed: removed.length
				},
				lastSync: Date.now(),
				sources,
				totalDomains: allDomains.size,
				version: `v${new Date().toISOString().substring(0, 10)}`
			})
		)

		const { error } = await client.from('disposable_domain_sync_log').insert(insertPayload)

		if (error) {
			console.error('Error logging sync result to Supabase:', error.message)
		} else {
			console.log(
				`Sync complete: +${added.length} added, -${removed.length} removed, ${allDomains.size} total`
			)
		}
	} catch (error) {
		console.error('Unexpected sync error:', error)

		await client.from('disposable_domain_sync_log').insert({
			added_domains: [],
			domains_added: 0,
			domains_removed: 0,
			error_message: error instanceof Error ? error.message : String(error),
			removed_domains: [],
			sources,
			success: false,
			synced_at: new Date().toISOString(),
			total_domains: 0
		})
	}

	return jsonResponse(results)
}
