import { createClient } from '../lib/supabase'
import { jsonResponse } from '../utils'

export async function syncDisposableDomains(env: Env): Promise<Response> {
	console.log('Starting disposable domain sync...')
	let results: Record<string, unknown> = {}

	const client = createClient(env)

	const sources = [
		'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf',
		'https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt',
		'https://raw.githubusercontent.com/ivolo/disposable-email-domains/master/index.json',
		'https://raw.githubusercontent.com/FGRibreau/mailchecker/refs/heads/master/list.txt',
		'https://gist.githubusercontent.com/adamloving/4401361/raw/e81212c3caecb54b87ced6392e0a0de2b6466287/temporary-email-address-domains'
	]

	try {
		// Get current cached list from KV
		const cachedDomainsArray = (await env.DISPOSABLE_DOMAINS.get<string[]>('domains:list', { type: 'json' })) ?? []
		const cachedDomains = new Set<string>(cachedDomainsArray)

		// Fetch from all sources in parallel
		const responses = await Promise.allSettled(sources.map((url) => fetch(url).then((r) => r.text())))

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

		// Safety check to abort if too many removals
		if (removed.length > cachedDomains.size * 0.1) {
			console.error(`Sync aborted: Removing too many domains: ${removed.length}`)
			await client.from('disposable_domain_sync_log').insert({
				...insertPayload,
				error_message: 'Safety check failed: too many removals',
				success: false
			})
			return jsonResponse(results)
		}

		// Update cache KV with full new list
		await env.DISPOSABLE_DOMAINS.put('domains:list', JSON.stringify(Array.from(allDomains)))

		// Update metadata
		await env.DISPOSABLE_DOMAINS.put(
			'domains:metadata',
			JSON.stringify({
				changes: {
					added: added.length,
					removed: removed.length
				},
				lastSync: Date.now(),
				sources: sources.map((s) => s.split('/').pop()),
				totalDomains: allDomains.size,
				version: `v${new Date().toISOString().substring(0, 10)}`
			})
		)

		const { error } = await client.from('disposable_domain_sync_log').insert(insertPayload)

		if (error) {
			console.error('Error logging sync result to Supabase:', error.message)
		} else {
			console.log(`Sync complete: +${added.length} added, -${removed.length} removed, ${allDomains.size} total`)
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
