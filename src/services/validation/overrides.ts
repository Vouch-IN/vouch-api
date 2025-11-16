import type { ValidationResults } from '../../types'

/**
 * Apply whitelist/blacklist overrides to validation results
 * Priority rules (specific to general):
 * 1. Specific email match (user@example.com)
 * 2. Domain match (example.com)
 *
 * Examples:
 * - Whitelist: admin@test.com, Blacklist: test.com -> admin@test.com is ALLOWED (specific email overrides domain)
 * - Whitelist: example.com, Blacklist: user@example.com -> user@example.com is BLOCKED (specific email overrides domain)
 */
export function applyOverrides(
	validationResults: ValidationResults,
	emailInput: string,
	whitelist: string[],
	blacklist: string[]
) {
	const email = emailInput.trim().toLowerCase()

	// Check for specific email matches first (highest priority)
	const whitelistedEmail = whitelist.some(
		(entry) => entry.includes('@') && entry.toLowerCase() === email
	)
	const blacklistedEmail = blacklist.some(
		(entry) => entry.includes('@') && entry.toLowerCase() === email
	)

	// Specific email rules take absolute priority
	if (whitelistedEmail) {
		return {
			...validationResults,
			checks: {
				...validationResults,
				whitelist: {
					latency: 0,
					pass: true
				}
			},
			signals: [...validationResults.signals, 'whitelisted']
		}
	}

	if (blacklistedEmail) {
		return {
			...validationResults,
			checks: {
				...validationResults,
				blacklist: {
					latency: 0,
					pass: true
				}
			},
			signals: [...validationResults.signals, 'blacklisted']
		}
	}

	// Check for domain matches (lower priority)
	const domain = email.split('@')[1]
	const whitelistedDomain = whitelist.some(
		(entry) => !entry.includes('@') && entry.toLowerCase() === domain
	)
	const blacklistedDomain = blacklist.some(
		(entry) => !entry.includes('@') && entry.toLowerCase() === domain
	)

	if (whitelistedDomain) {
		return {
			...validationResults,
			checks: {
				...validationResults,
				whitelist: {
					latency: 0,
					pass: true
				}
			},
			signals: [...validationResults.signals, 'whitelisted']
		}
	}

	if (blacklistedDomain) {
		return {
			...validationResults,
			checks: {
				...validationResults,
				blacklist: {
					latency: 0,
					pass: true
				}
			},
			signals: [...validationResults.signals, 'blacklisted']
		}
	}

	// No override
	return validationResults
}
