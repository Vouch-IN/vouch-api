import pAll from 'p-all'
import pRetry from 'p-retry'

import { createClient } from '../lib/supabase'
import { jsonResponse } from '../utils'

export async function syncDisposableDomains(env: Env): Promise<Response> {
	console.log('Starting disposable domain sync...')
	let results: Record<string, unknown> = {}

	const client = createClient(env)

	const sources = [
		// todo uncomment
		// 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf',
		// 'https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt',
		// 'https://raw.githubusercontent.com/ivolo/disposable-email-domains/master/index.json',
		// 'https://raw.githubusercontent.com/FGRibreau/mailchecker/refs/heads/master/list.txt',
		'https://gist.githubusercontent.com/adamloving/4401361/raw/e81212c3caecb54b87ced6392e0a0de2b6466287/temporary-email-address-domains'
	]

	try {
		// Get current cached domains from R2 text file instead of listing KV keys
		const R2_FILE_KEY = 'disposable-domains.txt'
		const cachedDomains = new Set<string>()
		let isFirstRun = false

		try {
			const r2Object = await env.SYNC_DATA.get(R2_FILE_KEY)
			if (r2Object) {
				const text = await r2Object.text()
				text
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line.length > 0)
					.forEach((domain) => cachedDomains.add(domain))
				console.log(`Loaded ${cachedDomains.size} domains from R2 cache`)
			} else {
				isFirstRun = true
				console.log('No R2 cache found - this is the first run')
			}
		} catch (error) {
			isFirstRun = true
			console.log('Error reading R2 cache - treating as first run:', error)
		}

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

		// Safety check to abort if too many removals (skip on first run)
		if (!isFirstRun && cachedDomains.size > 1000 && removed.length > cachedDomains.size * 0.1) {
			console.error(`Sync aborted: Removing too many domains: ${removed.length}`)
			await client.from('disposable_domain_sync_log').insert({
				...insertPayload,
				error_message: 'Safety check failed: too many removals',
				success: false
			})
			return jsonResponse(results)
		}

		if (isFirstRun) {
			console.log(`First run: Loading ${allDomains.size} domains into cache`)
		}

		// ============================================================
		// Update KV store with new data (batched with concurrency control)
		// ============================================================
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
