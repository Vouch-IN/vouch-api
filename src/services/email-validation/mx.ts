import { type MXResponse } from '../../types'
import { withTimeout } from '../../utils'

/**
 * Check if domain has valid MX records
 * @returns true if valid MX exists, false if no MX/invalid, null if DNS unreachable
 */
export async function checkMXRecords(
	email: string,
	domainPart: string,
	env: Env
): Promise<boolean | null> {
	// Handle empty domain
	if (!domainPart || domainPart.trim() === '') {
		return false
	}

	const cacheKey = `mx:${domainPart}`
	let hasMX: boolean | null = null
	const cached = await withTimeout(
		env.MX_CACHE.get<{ hasMX: boolean }>(cacheKey, { type: 'json' }),
		100
	)
	if (cached && typeof cached.hasMX === 'boolean') {
		hasMX = cached.hasMX
	} else {
		const r = await withTimeout(
			fetch(`https://dns.google/resolve?name=${encodeURIComponent(domainPart)}&type=MX`),
			600
		)
		if (r.ok) {
			const data: MXResponse = await r.json()
			// Check DNS response status and MX records
			// Status 0 = NOERROR (successful query)
			// Status 3 = NXDOMAIN (domain doesn't exist)
			// Status 2 = SERVFAIL (temporary DNS error)
			// Other statuses indicate various DNS errors
			if (data.Status === 0) {
				// Successful DNS query - check if valid MX records exist
				const answers = data.Answer ?? []
				
				if (answers.length === 0) {
					hasMX = false
				} else {
					// Check for Null MX (RFC 7505) - MX pointing to "." means no mail accepted
					const hasNullMX = answers.some(record => 
						record.data === '.' || record.data === '0 .'
					)
					
					if (hasNullMX) {
						// Null MX explicitly indicates domain does not accept mail
						hasMX = false
					} else {
						// Check for invalid MX targets
						const hasValidMX = answers.some(record => {
							const mxHost = record.data.split(' ')[1] || record.data
							// Filter out invalid/localhost targets
							return mxHost !== '.' && 
								   mxHost !== 'localhost' && 
								   !mxHost.startsWith('0.0.0.0') &&
								   !mxHost.startsWith('127.0.0.1')
						})
						hasMX = hasValidMX
					}
				}
			} else if (data.Status === 2) {
				// SERVFAIL - DNS server error, return null (unreachable, not invalid)
				hasMX = null
			} else if (data.Status === 3) {
				// NXDOMAIN - domain doesn't exist
				hasMX = false
			} else {
				// Other DNS errors (FORMERR, NOTIMP, REFUSED, etc.)
				hasMX = false
			}
			
			// Only cache definitive results (true/false), not null (temporary failures)
			if (hasMX !== null) {
				env.MX_CACHE.put(cacheKey, JSON.stringify({ hasMX }), { expirationTtl: 86400 }).catch(
					(error: unknown) => {
						console.error('Error caching mx records', error)
					}
				)
			}
		} else {
			// HTTP fetch failed - DNS API unreachable
			hasMX = null
		}
	}
	return hasMX
}
