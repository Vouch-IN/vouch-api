import pAll from 'p-all'
import pRetry from 'p-retry'

import { jsonResponse } from '../utils'

/**
 * Syncs IP reputation lists from reliable community sources
 *
 * Sources used:
 * - FireHOL: Actively maintained, updated daily (last verified: Nov 2025)
 * - Tor Project: Official exit node list, updated hourly
 * - Cloud Providers: Official IP ranges from AWS, GCP, Azure
 */
// Constants
const R2_VPN_IPS_KEY = 'vpn-ips.txt'
const R2_VPN_RANGES_KEY = 'vpn-ranges.txt'
const R2_TOR_IPS_KEY = 'tor-ips.txt'
const KV_BULK_BATCH_SIZE = 10000
const MAX_KV_OPERATIONS = 900

// Type for Cloudflare KV Bulk API response
type CloudflareKVBulkResponse = {
	errors: { message: string }[]
	result?: {
		successful_key_count?: number
		unsuccessful_keys?: string[]
	}
	success: boolean
}

// Reliable, verified sources (all actively maintained as of Nov 2025)
const sources = {
	// FireHOL Proxies (updated daily, covers all open proxies)
	// GitHub: firehol/blocklist-ipsets - 350+ maintained lists
	// ~1.5M IPs including SOCKS, SSL, and other proxy types
	anonymous: [
		// 'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_proxies.netset'
	],

	// Official Tor Project exit nodes (updated hourly)
	tor: [
		'https://check.torproject.org/exit-addresses' // Official Tor Project source
	]

	// NOTE: Datacenter/cloud IPs detected via ASN (request.cf.asn)
}

/**
 * Initial sync function - Run this ONCE to populate KV and R2 with all IPs
 * Uses Cloudflare bulk API to insert IPs efficiently
 */
export async function initIPLists(env: Env): Promise<Response> {
	console.log('Starting INITIAL IP reputation lists sync...')
	const results: Record<string, unknown> = {}

	// Check if already initialized
	try {
		const [vpnObj, torObj] = await Promise.all([
			env.SYNC_DATA.get(R2_VPN_IPS_KEY),
			env.SYNC_DATA.get(R2_TOR_IPS_KEY)
		])

		if (vpnObj || torObj) {
			const errorMsg = 'R2 cache already exists. Use syncIPLists for updates.'
			console.error(errorMsg)
			return jsonResponse({ error: errorMsg, success: false }, 400)
		}
	} catch {
		console.log('No R2 cache found - proceeding with initial sync')
	}

	try {
		// Get credentials
		if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
			throw new Error('CF_ACCOUNT_ID and CF_API_TOKEN are required for bulk operations')
		}

		// ============================================================
		// 1. Fetch Anonymous/VPN/Proxy IPs from FireHOL
		// ============================================================
		const anonymousIPs = new Set<string>()
		const anonymousRanges: string[] = []

		for (const url of sources.anonymous) {
			try {
				const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
				if (!response.ok) {
					console.error(`Failed to fetch ${url}: ${response.status}`)
					continue
				}

				const text = await response.text()

				// Parse netset format (supports both IPs and CIDR ranges)
				text
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line && !line.startsWith('#'))
					.forEach((entry) => {
						if (entry.includes('/')) {
							anonymousRanges.push(entry)
						} else {
							anonymousIPs.add(entry)
						}
					})
			} catch (error) {
				console.error(`Error fetching ${url}:`, error)
			}
		}

		console.log(`Fetched ${anonymousIPs.size} VPN IPs and ${anonymousRanges.length} CIDR ranges`)

		// ============================================================
		// 2. Fetch Tor Exit Nodes
		// ============================================================
		const torIPs = new Set<string>()

		for (const url of sources.tor) {
			try {
				const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
				if (!response.ok) continue

				const text = await response.text()

				// Parse Tor Project format
				text
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line && !line.startsWith('#'))
					.forEach((line) => {
						const parts = line.split(/\s+/)
						const ip = parts[0] === 'ExitAddress' ? parts[1] : parts[0]

						if (ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
							torIPs.add(ip)
						}
					})

				if (torIPs.size > 100) break
			} catch (error) {
				console.error(`Error fetching Tor list from ${url}:`, error)
			}
		}

		console.log(`Fetched ${torIPs.size} Tor exit node IPs`)

		// ============================================================
		// 3. Bulk insert VPN IPs to KV
		// ============================================================
		if (env.VPN_IPS) {
			const vpnIPsArray = Array.from(anonymousIPs)
			const totalBatches = Math.ceil(vpnIPsArray.length / KV_BULK_BATCH_SIZE)

			console.log(`Inserting ${vpnIPsArray.length} VPN IPs in ${totalBatches} batches...`)

			let successfulBatches = 0
			let failedBatches = 0

			for (let i = 0; i < totalBatches; i++) {
				const start = i * KV_BULK_BATCH_SIZE
				const end = Math.min(start + KV_BULK_BATCH_SIZE, vpnIPsArray.length)
				const batch = vpnIPsArray.slice(start, end)

				const keyValuePairs = batch.map((ip) => ({
					expiration_ttl: 86400 * 7,
					key: ip,
					value: '1'
				}))

				try {
					const response = await fetch(
						`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/storage/kv/namespaces/${env.VPN_IPS_NAMESPACE_ID}/bulk`,
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
							`VPN Batch ${i + 1}/${totalBatches}: ${result.result?.successful_key_count ?? batch.length} IPs inserted`
						)
					} else {
						failedBatches++
						console.error(
							`VPN Batch ${i + 1}/${totalBatches} failed:`,
							result.errors.map((e) => e.message).join(', ')
						)
					}
				} catch (error) {
					failedBatches++
					console.error(`VPN Batch ${i + 1}/${totalBatches} error:`, error)
				}
			}

			// Store CIDR ranges separately
			if (anonymousRanges.length > 0) {
				await env.VPN_IPS.put('_ranges', JSON.stringify(anonymousRanges), {
					expirationTtl: 86400 * 7
				})
			}

			console.log(`VPN bulk insert: ${successfulBatches} successful, ${failedBatches} failed`)
		}

		// ============================================================
		// 4. Bulk insert Tor IPs to KV
		// ============================================================
		if (env.TOR_IPS) {
			const torIPsArray = Array.from(torIPs)
			const totalBatches = Math.ceil(torIPsArray.length / KV_BULK_BATCH_SIZE)

			console.log(`Inserting ${torIPsArray.length} Tor IPs in ${totalBatches} batches...`)

			let successfulBatches = 0
			let failedBatches = 0

			for (let i = 0; i < totalBatches; i++) {
				const start = i * KV_BULK_BATCH_SIZE
				const end = Math.min(start + KV_BULK_BATCH_SIZE, torIPsArray.length)
				const batch = torIPsArray.slice(start, end)

				const keyValuePairs = batch.map((ip) => ({
					expiration_ttl: 86400 * 2,
					key: ip,
					value: '1'
				}))

				try {
					const response = await fetch(
						`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/storage/kv/namespaces/${env.TOR_IPS_NAMESPACE_ID}/bulk`,
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
							`Tor Batch ${i + 1}/${totalBatches}: ${result.result?.successful_key_count ?? batch.length} IPs inserted`
						)
					} else {
						failedBatches++
						console.error(
							`Tor Batch ${i + 1}/${totalBatches} failed:`,
							result.errors.map((e) => e.message).join(', ')
						)
					}
				} catch (error) {
					failedBatches++
					console.error(`Tor Batch ${i + 1}/${totalBatches} error:`, error)
				}
			}

			console.log(`Tor bulk insert: ${successfulBatches} successful, ${failedBatches} failed`)
		}

		// ============================================================
		// 5. Write to R2
		// ============================================================
		const r2Updates = []

		if (anonymousIPs.size > 0) {
			const sortedVPNIPs = Array.from(anonymousIPs).sort()
			r2Updates.push(
				env.SYNC_DATA.put(R2_VPN_IPS_KEY, sortedVPNIPs.join('\n'), {
					httpMetadata: { contentType: 'text/plain' }
				})
			)
		}

		if (anonymousRanges.length > 0) {
			const sortedRanges = anonymousRanges.sort()
			r2Updates.push(
				env.SYNC_DATA.put(R2_VPN_RANGES_KEY, sortedRanges.join('\n'), {
					httpMetadata: { contentType: 'text/plain' }
				})
			)
		}

		if (torIPs.size > 0) {
			const sortedTorIPs = Array.from(torIPs).sort()
			r2Updates.push(
				env.SYNC_DATA.put(R2_TOR_IPS_KEY, sortedTorIPs.join('\n'), {
					httpMetadata: { contentType: 'text/plain' }
				})
			)
		}

		await Promise.all(r2Updates)
		console.log('R2 cache updated successfully')

		results.success = true
		results.synced_at = new Date().toISOString()
		results.vpn = {
			ips: anonymousIPs.size,
			ranges: anonymousRanges.length
		}
		results.tor = {
			ips: torIPs.size
		}

		console.log(
			`Initial sync complete: ${anonymousIPs.size} VPN IPs, ${anonymousRanges.length} ranges, ${torIPs.size} Tor IPs`
		)
	} catch (error) {
		console.error('Initial IP sync failed:', error)
		results.success = false
		results.error = error instanceof Error ? error.message : String(error)
	}

	return jsonResponse(results)
}

/**
 * Incremental sync function - Run this regularly to update KV with changes
 * Only syncs the diff between current R2 cache and new data
 */
export async function syncIPLists(env: Env): Promise<Response> {
	console.log('Starting incremental IP reputation lists sync...')

	const results: Record<string, unknown> = {}

	try {
		// ============================================================
		// 1. Check R2 cache existence (CRITICAL)
		// ============================================================
		const [vpnIPsObj, torIPsObj] = await Promise.all([
			env.SYNC_DATA.get(R2_VPN_IPS_KEY),
			env.SYNC_DATA.get(R2_TOR_IPS_KEY)
		])

		if (!vpnIPsObj || !torIPsObj) {
			const errorMsg = 'R2 cache not found. Please run initIPLists first to perform initial sync.'
			console.error(errorMsg)
			return jsonResponse({ error: errorMsg, success: false }, 400)
		}

		// ============================================================
		// 2. Load current cached data from R2
		// ============================================================
		const cachedVPNs = new Set<string>()
		const cachedVPNRanges: string[] = []
		const cachedTor = new Set<string>()

		// Load VPN IPs
		const vpnText = await vpnIPsObj.text()
		vpnText
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.forEach((ip) => cachedVPNs.add(ip))
		console.log(`Loaded ${cachedVPNs.size} VPN IPs from R2 cache`)

		// Load VPN ranges
		const vpnRangesObj = await env.SYNC_DATA.get(R2_VPN_RANGES_KEY)
		if (vpnRangesObj) {
			const rangesText = await vpnRangesObj.text()
			rangesText
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line.length > 0)
				.forEach((range) => cachedVPNRanges.push(range))
			console.log(`Loaded ${cachedVPNRanges.length} VPN ranges from R2 cache`)
		}

		// Load Tor IPs
		const torText = await torIPsObj.text()
		torText
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.forEach((ip) => cachedTor.add(ip))
		console.log(`Loaded ${cachedTor.size} Tor IPs from R2 cache`)

		// ============================================================
		// 3. Fetch fresh data from sources
		// ============================================================
		const anonymousIPs = new Set<string>()
		const anonymousRanges: string[] = []

		for (const url of sources.anonymous) {
			try {
				const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
				if (!response.ok) {
					console.error(`Failed to fetch ${url}: ${response.status}`)
					continue
				}

				const text = await response.text()

				text
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line && !line.startsWith('#'))
					.forEach((entry) => {
						if (entry.includes('/')) {
							anonymousRanges.push(entry)
						} else {
							anonymousIPs.add(entry)
						}
					})
			} catch (error) {
				console.error(`Error fetching ${url}:`, error)
			}
		}

		// Fetch Tor IPs
		const torIPs = new Set<string>()

		for (const url of sources.tor) {
			try {
				const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
				if (!response.ok) continue

				const text = await response.text()

				text
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line && !line.startsWith('#'))
					.forEach((line) => {
						const parts = line.split(/\s+/)
						const ip = parts[0] === 'ExitAddress' ? parts[1] : parts[0]

						if (ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
							torIPs.add(ip)
						}
					})

				if (torIPs.size > 100) break
			} catch (error) {
				console.error(`Error fetching Tor list from ${url}:`, error)
			}
		}

		// ============================================================
		// 4. Compute incremental changes
		// ============================================================
		const vpnAdded = Array.from(anonymousIPs).filter((ip) => !cachedVPNs.has(ip))
		const vpnRemoved = Array.from(cachedVPNs).filter((ip) => !anonymousIPs.has(ip))

		const torAdded = Array.from(torIPs).filter((ip) => !cachedTor.has(ip))
		const torRemoved = Array.from(cachedTor).filter((ip) => !torIPs.has(ip))

		console.log(
			`Changes: VPN +${vpnAdded.length}/-${vpnRemoved.length}, Tor +${torAdded.length}/-${torRemoved.length}`
		)

		// ============================================================
		// 5. Safety checks to prevent mass deletions
		// ============================================================
		if (vpnRemoved.length > cachedVPNs.size * 0.2 && cachedVPNs.size > 100) {
			const errorMsg = `Safety check failed: ${vpnRemoved.length} VPN IPs would be removed (${((vpnRemoved.length / cachedVPNs.size) * 100).toFixed(1)}%)`
			console.error(`Sync aborted: ${errorMsg}`)
			return jsonResponse({ error: errorMsg, success: false }, 500)
		}

		if (torRemoved.length > cachedTor.size * 0.3 && cachedTor.size > 50) {
			const errorMsg = `Safety check failed: ${torRemoved.length} Tor IPs would be removed (${((torRemoved.length / cachedTor.size) * 100).toFixed(1)}%)`
			console.error(`Sync aborted: ${errorMsg}`)
			return jsonResponse({ error: errorMsg, success: false }, 500)
		}

		// ============================================================
		// 6. Update KV stores with changes (with limit protection)
		// ============================================================
		const totalKVOperations =
			vpnAdded.length + vpnRemoved.length + torAdded.length + torRemoved.length

		// Check if we exceed the safe limit
		if (totalKVOperations > MAX_KV_OPERATIONS) {
			const warningMsg = `Too many KV operations required (${totalKVOperations}). Exceeds safe limit of ${MAX_KV_OPERATIONS}. Skipping KV sync, only updating R2.`
			console.warn(warningMsg)

			// Still update R2
			const r2Updates = []

			if (anonymousIPs.size > 0) {
				r2Updates.push(
					env.SYNC_DATA.put(R2_VPN_IPS_KEY, Array.from(anonymousIPs).sort().join('\n'), {
						httpMetadata: { contentType: 'text/plain' }
					})
				)
			}

			if (anonymousRanges.length > 0) {
				r2Updates.push(
					env.SYNC_DATA.put(R2_VPN_RANGES_KEY, anonymousRanges.sort().join('\n'), {
						httpMetadata: { contentType: 'text/plain' }
					})
				)
			}

			if (torIPs.size > 0) {
				r2Updates.push(
					env.SYNC_DATA.put(R2_TOR_IPS_KEY, Array.from(torIPs).sort().join('\n'), {
						httpMetadata: { contentType: 'text/plain' }
					})
				)
			}

			await Promise.all(r2Updates)

			results.success = false
			results.warning = warningMsg
			results.synced_at = new Date().toISOString()

			return jsonResponse(results)
		}

		// Proceed with KV updates
		const kvOperations: (() => Promise<unknown>)[] = []

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

		// VPN IP changes
		if (env.VPN_IPS) {
			const vpnKV = env.VPN_IPS

			vpnAdded.forEach((ip) => {
				kvOperations.push(createKVOperation(() => vpnKV.put(ip, '1', { expirationTtl: 86400 * 7 })))
			})

			vpnRemoved.forEach((ip) => {
				kvOperations.push(createKVOperation(() => vpnKV.delete(ip)))
			})

			// Update ranges
			if (anonymousRanges.length > 0) {
				kvOperations.push(
					createKVOperation(() =>
						vpnKV.put('_ranges', JSON.stringify(anonymousRanges), {
							expirationTtl: 86400 * 7
						})
					)
				)
			}
		}

		// Tor IP changes
		if (env.TOR_IPS) {
			const torKV = env.TOR_IPS

			torAdded.forEach((ip) => {
				kvOperations.push(createKVOperation(() => torKV.put(ip, '1', { expirationTtl: 86400 * 2 })))
			})

			torRemoved.forEach((ip) => {
				kvOperations.push(createKVOperation(() => torKV.delete(ip)))
			})
		}

		// Execute KV operations
		console.log(`Executing ${kvOperations.length} KV operations...`)

		let failedOpsCount = 0
		await pAll(kvOperations, {
			concurrency: 20,
			stopOnError: false
		}).catch((errors: unknown) => {
			if (errors instanceof AggregateError) {
				failedOpsCount = errors.errors.length
				console.warn(`${failedOpsCount} KV operations failed after retries`)
			}
		})

		if (failedOpsCount === 0) {
			console.log(`Successfully completed ${kvOperations.length} KV operations`)
		}

		// ============================================================
		// 7. Update R2 cache
		// ============================================================
		const r2Updates = []

		if (anonymousIPs.size > 0) {
			r2Updates.push(
				env.SYNC_DATA.put(R2_VPN_IPS_KEY, Array.from(anonymousIPs).sort().join('\n'), {
					httpMetadata: { contentType: 'text/plain' }
				})
			)
		}

		if (anonymousRanges.length > 0) {
			r2Updates.push(
				env.SYNC_DATA.put(R2_VPN_RANGES_KEY, anonymousRanges.sort().join('\n'), {
					httpMetadata: { contentType: 'text/plain' }
				})
			)
		}

		if (torIPs.size > 0) {
			r2Updates.push(
				env.SYNC_DATA.put(R2_TOR_IPS_KEY, Array.from(torIPs).sort().join('\n'), {
					httpMetadata: { contentType: 'text/plain' }
				})
			)
		}

		await Promise.all(r2Updates)
		console.log(
			`Updated R2 cache: ${anonymousIPs.size} VPN IPs, ${anonymousRanges.length} ranges, ${torIPs.size} Tor IPs`
		)

		// ============================================================
		// 8. Log results
		// ============================================================
		results.success = true
		results.synced_at = new Date().toISOString()
		results.vpn = {
			added: vpnAdded.length,
			ips: anonymousIPs.size,
			ranges: anonymousRanges.length,
			removed: vpnRemoved.length
		}
		results.tor = {
			added: torAdded.length,
			ips: torIPs.size,
			removed: torRemoved.length
		}

		console.log(
			`Sync complete: VPN +${vpnAdded.length}/-${vpnRemoved.length} (${anonymousIPs.size} IPs, ${anonymousRanges.length} ranges), Tor +${torAdded.length}/-${torRemoved.length} (${torIPs.size} IPs)`
		)
	} catch (error) {
		console.error('IP reputation sync failed:', error)
		results.success = false
		results.error = error instanceof Error ? error.message : String(error)
	}

	return jsonResponse(results)
}
