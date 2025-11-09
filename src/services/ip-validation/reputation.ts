import { getASNName, isDatacenterASN } from '../../constants/asn'
import { type IPData } from '../../types'
import { withTimeout } from '../../utils'

/**
 * IP Reputation Checks
 *
 * Data sources:
 * - FireHOL Proxies: VPN/Proxy IPs (firehol_proxies.netset) - updated daily
 * - Tor Project: Official exit nodes - updated hourly
 * - ASN Detection: Instant datacenter detection via Cloudflare request.cf.asn
 *
 * All sources verified as actively maintained (Nov 2025)
 */

// ============================================================
// Exported Functions (Main API)
// ============================================================

/**
 * Check if IP belongs to datacenter/hosting ASN
 * Uses Cloudflare's request.cf.asn (instant, no KV needed)
 */
export function checkDatacenterASN(asn: number | undefined): boolean {
	const isDatacenter = isDatacenterASN(asn)

	if (isDatacenter && asn) {
		console.log(`Datacenter detected: ${getASNName(asn)} (ASN ${asn})`)
	}

	return isDatacenter
}

/**
 * Run all IP reputation checks in parallel
 * Returns combined reputation data for risk scoring
 *
 * @param ip - IP address to check
 * @param asn - Autonomous System Number from Cloudflare
 * @param env - Worker environment
 * @param apiKeyType - Type of API key ('client' or 'server')
 *
 * Note: Datacenter detection is skipped for server keys since backend servers
 * are expected to run in datacenters (AWS, GCP, Azure, etc.)
 */
export async function checkIPReputation(
	ip: string,
	asn: unknown,
	env: Env,
	apiKeyType?: 'client' | 'server'
): Promise<IPData> {
	const asnNumber = typeof asn === 'number' ? asn : undefined

	// Skip datacenter detection for server keys (backend servers are expected in datacenters)
	const shouldCheckDatacenter = apiKeyType !== 'server'

	// Run all checks in parallel for optimal performance
	const [isVPN, isTor, isDatacenter] = await Promise.all([
		checkVPNOrProxy(ip, env), // ~100-500ms (KV + CIDR)
		checkTorExitNode(ip, env), // ~100-300ms (KV lookup)
		Promise.resolve(shouldCheckDatacenter ? checkDatacenterASN(asnNumber) : false) // ~0ms (instant)
	])

	// Any anonymity/hosting signal = suspicious
	// Note: Some legitimate users use VPNs/cloud services
	// Risk scoring should weigh appropriately, not auto-block
	const isSuspicious = isVPN || isTor || isDatacenter

	return {
		ip,
		isFraud: false, // Reserved for future fraud IP tracking
		isVPN: isSuspicious // Combined for backward compatibility
	}
}

// ============================================================
// Internal Check Functions
// ============================================================

/**
 * Check if IP is a Tor exit node
 */
async function checkTorExitNode(ip: string, env: Env): Promise<boolean> {
	try {
		if (!env.TOR_IPS) return false

		const result = await withTimeout(env.TOR_IPS.get(ip), 300)
		if (result !== null) {
			console.log(`Tor exit node detected: ${ip}`)
			return true
		}

		return false
	} catch (error) {
		console.error('Tor check error:', error)
		return false // Fail open
	}
}

/**
 * Check if IP is in VPN/Proxy database (FireHOL)
 * Checks both individual IPs and CIDR ranges
 */
async function checkVPNOrProxy(ip: string, env: Env): Promise<boolean> {
	try {
		if (!env.VPN_IPS) return false

		// Check direct IP match
		const directMatch = await withTimeout(env.VPN_IPS.get(ip), 300)
		if (directMatch !== null) {
			console.log(`VPN/Proxy detected: ${ip}`)
			return true
		}

		// Check CIDR ranges
		const rangesStr = await withTimeout(env.VPN_IPS.get('_ranges'), 500)
		if (rangesStr) {
			const ranges = JSON.parse(rangesStr) as string[]
			if (ranges.some((range) => ipInCIDR(ip, range))) {
				console.log(`VPN/Proxy detected (CIDR match): ${ip}`)
				return true
			}
		}

		return false
	} catch (error) {
		console.error('VPN/Proxy check error:', error)
		return false // Fail open
	}
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Check if IP is in CIDR range using bitwise operations
 */
function ipInCIDR(ip: string, cidr: string): boolean {
	try {
		const [range, bits] = cidr.split('/')
		if (!bits) return false

		const mask = ~(2 ** (32 - parseInt(bits)) - 1)

		const ipInt = ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct), 0) >>> 0
		const rangeInt =
			range.split('.').reduce((int, oct) => (int << 8) + parseInt(oct), 0) >>> 0

		return (ipInt & mask) === (rangeInt & mask)
	} catch {
		return false
	}
}
