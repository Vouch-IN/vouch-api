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

export async function syncIPLists(env: Env): Promise<Response> {
	console.log('Starting IP reputation lists sync...')

	const results: Record<string, unknown> = {}

	// Reliable, verified sources (all actively maintained as of Nov 2025)
	const sources = {
		// FireHOL Proxies (updated daily, covers all open proxies)
		// GitHub: firehol/blocklist-ipsets - 350+ maintained lists
		// ~1.5M IPs including SOCKS, SSL, and other proxy types
		anonymous: [
			'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_proxies.netset'
		],

		// Official Tor Project exit nodes (updated hourly)
		tor: [
			'https://check.torproject.org/exit-addresses' // Official Tor Project source
		]

		// NOTE: Datacenter/cloud IPs detected via ASN (request.cf.asn)
	}

	try {
		// R2 file keys for caching
		const R2_VPN_IPS_KEY = 'vpn-ips.txt'
		const R2_VPN_RANGES_KEY = 'vpn-ranges.txt'
		const R2_TOR_IPS_KEY = 'tor-ips.txt'

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
							// CIDR range
							// todo uncomment
							// anonymousRanges.push(entry)
						} else {
							// Individual IP
							// todo uncomment
							// anonymousIPs.add(entry)
						}
					})
			} catch (error) {
				console.error(`Error fetching ${url}:`, error)
			}
		}

		// ============================================================
		// 2. Fetch Tor Exit Nodes from Official Tor Project
		// ============================================================
		const torIPs = new Set<string>()

		for (const url of sources.tor) {
			try {
				const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
				if (!response.ok) continue

				const text = await response.text()

				// Parse Tor Project format (ExitAddress IP timestamp)
				// Or simple IP list from FireHOL backup
				text
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line && !line.startsWith('#'))
					.forEach((line) => {
						// Handle "ExitAddress 1.2.3.4 2025-11-08 12:00:00" format
						const parts = line.split(/\s+/)
						const ip = parts[0] === 'ExitAddress' ? parts[1] : parts[0]

						// Validate IP format
						if (ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
							torIPs.add(ip)
						}
					})

				// If we got IPs from first source, break (prefer official)
				if (torIPs.size > 100) break
			} catch (error) {
				console.error(`Error fetching Tor list from ${url}:`, error)
			}
		}

		// ============================================================
		// 3. Get current cached IPs from R2 instead of listing KV keys
		// ============================================================
		// NOTE: Datacenter detection now uses ASN (instant, no KV needed)
		// See src/constants/asn.ts and src/services/ip-validation/reputation.ts
		const cachedVPNs = new Set<string>()
		const cachedVPNRanges: string[] = []
		const cachedTor = new Set<string>()
		let isFirstRunVPN = false
		let isFirstRunTor = false

		// Load cached VPN IPs from R2
		try {
			const [vpnIPsObj, vpnRangesObj] = await Promise.all([
				env.SYNC_DATA.get(R2_VPN_IPS_KEY),
				env.SYNC_DATA.get(R2_VPN_RANGES_KEY)
			])

			if (vpnIPsObj) {
				const text = await vpnIPsObj.text()
				text
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line.length > 0)
					.forEach((ip) => cachedVPNs.add(ip))
				console.log(`Loaded ${cachedVPNs.size} VPN IPs from R2 cache`)
			} else {
				isFirstRunVPN = true
				console.log('No R2 VPN cache found - this is the first run')
			}

			if (vpnRangesObj) {
				const text = await vpnRangesObj.text()
				text
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line.length > 0)
					.forEach((range) => cachedVPNRanges.push(range))
				console.log(`Loaded ${cachedVPNRanges.length} VPN ranges from R2 cache`)
			}
		} catch (error) {
			isFirstRunVPN = true
			console.log('Error reading R2 VPN cache - treating as first run:', error)
		}

		// Load cached Tor IPs from R2
		try {
			const torIPsObj = await env.SYNC_DATA.get(R2_TOR_IPS_KEY)
			if (torIPsObj) {
				const text = await torIPsObj.text()
				text
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line.length > 0)
					.forEach((ip) => cachedTor.add(ip))
				console.log(`Loaded ${cachedTor.size} Tor IPs from R2 cache`)
			} else {
				isFirstRunTor = true
				console.log('No R2 Tor cache found - this is the first run')
			}
		} catch (error) {
			isFirstRunTor = true
			console.log('Error reading R2 Tor cache - treating as first run:', error)
		}

		// ============================================================
		// 4. Compute incremental changes
		// ============================================================
		const vpnAdded = Array.from(anonymousIPs).filter((ip) => !cachedVPNs.has(ip))
		const vpnRemoved = Array.from(cachedVPNs).filter((ip) => !anonymousIPs.has(ip))

		const torAdded = Array.from(torIPs).filter((ip) => !cachedTor.has(ip))
		const torRemoved = Array.from(cachedTor).filter((ip) => !torIPs.has(ip))

		// ============================================================
		// 5. Safety checks to prevent mass deletions (skip on first run)
		// ============================================================
		if (!isFirstRunVPN && vpnRemoved.length > cachedVPNs.size * 0.2 && cachedVPNs.size > 100) {
			const errorMsg = `Safety check failed: ${vpnRemoved.length} VPN IPs would be removed (${((vpnRemoved.length / cachedVPNs.size) * 100).toFixed(1)}%)`
			console.error(`Sync aborted: ${errorMsg}`)

			return jsonResponse({ error: errorMsg, success: false }, 500)
		}

		if (!isFirstRunTor && torRemoved.length > cachedTor.size * 0.3 && cachedTor.size > 50) {
			const errorMsg = `Safety check failed: ${torRemoved.length} Tor IPs would be removed (${((torRemoved.length / cachedTor.size) * 100).toFixed(1)}%)`
			console.error(`Sync aborted: ${errorMsg}`)

			return jsonResponse({ error: errorMsg, success: false }, 500)
		}

		if (isFirstRunVPN) {
			console.log(
				`First run VPN: Loading ${anonymousIPs.size} IPs and ${anonymousRanges.length} ranges into cache`
			)
		}

		if (isFirstRunTor) {
			console.log(`First run Tor: Loading ${torIPs.size} IPs into cache`)
		}

		// ============================================================
		// 6. Update KV stores with new data (batched with concurrency control)
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

		// Add new VPN/Anonymous IPs
		if (env.VPN_IPS) {
			const vpnKV = env.VPN_IPS
			vpnAdded.forEach((ip) => {
				kvOperations.push(createKVOperation(() => vpnKV.put(ip, '1', { expirationTtl: 86400 * 7 })))
			})

			// Remove old VPN IPs
			vpnRemoved.forEach((ip) => {
				kvOperations.push(createKVOperation(() => vpnKV.delete(ip)))
			})

			// Store CIDR ranges (VPN/proxy ranges)
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

		// Add new Tor IPs
		if (env.TOR_IPS) {
			const torKV = env.TOR_IPS
			torAdded.forEach((ip) => {
				kvOperations.push(createKVOperation(() => torKV.put(ip, '1', { expirationTtl: 86400 * 2 })))
			})

			// Remove old Tor IPs
			torRemoved.forEach((ip) => {
				kvOperations.push(createKVOperation(() => torKV.delete(ip)))
			})
		}

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

		// ============================================================
		// 7. Update R2 cache with the new IP lists
		// ============================================================
		const r2Updates = []

		// Update VPN IPs cache
		if (anonymousIPs.size > 0) {
			const sortedVPNIPs = Array.from(anonymousIPs).sort()
			const vpnIPsText = sortedVPNIPs.join('\n')
			r2Updates.push(
				env.SYNC_DATA.put(R2_VPN_IPS_KEY, vpnIPsText, {
					httpMetadata: {
						contentType: 'text/plain'
					}
				})
			)
		}

		// Update VPN ranges cache
		if (anonymousRanges.length > 0) {
			const sortedVPNRanges = anonymousRanges.sort()
			const vpnRangesText = sortedVPNRanges.join('\n')
			r2Updates.push(
				env.SYNC_DATA.put(R2_VPN_RANGES_KEY, vpnRangesText, {
					httpMetadata: {
						contentType: 'text/plain'
					}
				})
			)
		}

		// Update Tor IPs cache
		if (torIPs.size > 0) {
			const sortedTorIPs = Array.from(torIPs).sort()
			const torIPsText = sortedTorIPs.join('\n')
			r2Updates.push(
				env.SYNC_DATA.put(R2_TOR_IPS_KEY, torIPsText, {
					httpMetadata: {
						contentType: 'text/plain'
					}
				})
			)
		}

		await Promise.all(r2Updates)
		console.log(
			`Updated R2 cache: ${anonymousIPs.size} VPN IPs, ${anonymousRanges.length} VPN ranges, ${torIPs.size} Tor IPs`
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
			removed: vpnRemoved.length,
			total: anonymousIPs.size + anonymousRanges.length
		}
		results.tor = {
			added: torAdded.length,
			ips: torIPs.size,
			removed: torRemoved.length
		}

		console.log(
			`Sync complete: VPN +${vpnAdded.length}/-${vpnRemoved.length} (${anonymousIPs.size} IPs, ${anonymousRanges.length} ranges), Tor +${torAdded.length}/-${torRemoved.length} (${torIPs.size} IPs). Datacenter detection via ASN (instant, no sync needed)`
		)
	} catch (error) {
		console.error('IP reputation sync failed:', error)
		results.success = false
		results.error = error instanceof Error ? error.message : String(error)
	}

	return jsonResponse(results)
}
