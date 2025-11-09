import { createClient } from '../lib/supabase'
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

	const client = createClient(env)
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
				text.split('\n')
					.map((line) => line.trim())
					.filter((line) => line && !line.startsWith('#'))
					.forEach((entry) => {
						if (entry.includes('/')) {
							// CIDR range
							anonymousRanges.push(entry)
						} else {
							// Individual IP
							anonymousIPs.add(entry)
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
				text.split('\n')
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
		// 3. Get current cached IPs for incremental updates
		// ============================================================
		// NOTE: Datacenter detection now uses ASN (instant, no KV needed)
		// See src/constants/asn.ts and src/services/ip-validation/reputation.ts
		const [vpnList, torList] = await Promise.all([
			env.VPN_IPS ? env.VPN_IPS.list() : Promise.resolve({ keys: [] }),
			env.TOR_IPS ? env.TOR_IPS.list() : Promise.resolve({ keys: [] })
		])

		const cachedVPNs = new Set(vpnList.keys.map((k) => k.name))
		const cachedTor = new Set(torList.keys.map((k) => k.name))

		// ============================================================
		// 4. Compute incremental changes
		// ============================================================
		const vpnAdded = Array.from(anonymousIPs).filter((ip) => !cachedVPNs.has(ip))
		const vpnRemoved = Array.from(cachedVPNs).filter((ip) => !anonymousIPs.has(ip))

		const torAdded = Array.from(torIPs).filter((ip) => !cachedTor.has(ip))
		const torRemoved = Array.from(cachedTor).filter((ip) => !torIPs.has(ip))

		// ============================================================
		// 5. Safety checks to prevent mass deletions
		// ============================================================
		if (vpnRemoved.length > cachedVPNs.size * 0.2 && cachedVPNs.size > 100) {
			const errorMsg = `Safety check failed: ${vpnRemoved.length} VPN IPs would be removed (${((vpnRemoved.length / cachedVPNs.size) * 100).toFixed(1)}%)`
			console.error(`Sync aborted: ${errorMsg}`)

			await client.from('disposable_domain_sync_log').insert({
				added_domains: [],
				domains_added: 0,
				domains_removed: 0,
				error_message: errorMsg,
				removed_domains: [],
				sources: Object.values(sources).flat(),
				success: false,
				synced_at: new Date().toISOString(),
				total_domains: 0
			})

			return jsonResponse({ error: errorMsg, success: false }, 500)
		}

		if (torRemoved.length > cachedTor.size * 0.3 && cachedTor.size > 50) {
			const errorMsg = `Safety check failed: ${torRemoved.length} Tor IPs would be removed (${((torRemoved.length / cachedTor.size) * 100).toFixed(1)}%)`
			console.error(`Sync aborted: ${errorMsg}`)

			return jsonResponse({ error: errorMsg, success: false }, 500)
		}

		// ============================================================
		// 6. Update KV stores with new data
		// ============================================================
		const kvPromises: Promise<unknown>[] = []

		// Add new VPN/Anonymous IPs
		vpnAdded.forEach((ip) => {
			if (env.VPN_IPS) kvPromises.push(env.VPN_IPS.put(ip, '1', { expirationTtl: 86400 * 7 }))
		})

		// Remove old VPN IPs
		vpnRemoved.forEach((ip) => {
			if (env.VPN_IPS) kvPromises.push(env.VPN_IPS.delete(ip))
		})

		// Add new Tor IPs
		torAdded.forEach((ip) => {
			if (env.TOR_IPS) kvPromises.push(env.TOR_IPS.put(ip, '1', { expirationTtl: 86400 * 2 }))
		})

		// Remove old Tor IPs
		torRemoved.forEach((ip) => {
			if (env.TOR_IPS) kvPromises.push(env.TOR_IPS.delete(ip))
		})

		// Store CIDR ranges (VPN/proxy ranges)
		if (env.VPN_IPS && anonymousRanges.length > 0) {
			kvPromises.push(
				env.VPN_IPS.put('_ranges', JSON.stringify(anonymousRanges), {
					expirationTtl: 86400 * 7
				})
			)
		}

		// Execute all KV operations
		await Promise.allSettled(kvPromises)

		// ============================================================
		// 7. Log results
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

		// Log to Supabase
		await client.from('disposable_domain_sync_log').insert({
			added_domains: [],
			domains_added: vpnAdded.length + torAdded.length,
			domains_removed: vpnRemoved.length + torRemoved.length,
			error_message: '',
			removed_domains: [],
			sources: Object.values(sources).flat(),
			success: true,
			synced_at: new Date().toISOString(),
			total_domains: anonymousIPs.size + torIPs.size + anonymousRanges.length
		})
	} catch (error) {
		console.error('IP reputation sync failed:', error)
		results.success = false
		results.error = error instanceof Error ? error.message : String(error)

		await client.from('disposable_domain_sync_log').insert({
			added_domains: [],
			domains_added: 0,
			domains_removed: 0,
			error_message: String(error),
			removed_domains: [],
			sources: Object.values(sources).flat(),
			success: false,
			synced_at: new Date().toISOString(),
			total_domains: 0
		})
	}

	return jsonResponse(results)
}
