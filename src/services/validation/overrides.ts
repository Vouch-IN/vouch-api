import type { ValidationResults } from '../../types'

export function applyOverrides(
	validationResults: ValidationResults,
	emailInput: string,
	whitelist: string[],
	blacklist: string[]
) {
	const email = emailInput.trim().toLowerCase()

	// If email matches whitelist, override to always valid and allow
	if (matchesEntry(email, whitelist)) {
		return {
			...validationResults,
			signals: [...validationResults.signals, 'whitelisted']
		}
	}

	// If email matches blacklist, force block and max risk score
	if (matchesEntry(email, blacklist)) {
		return {
			...validationResults,
			signals: [...validationResults.signals, 'blacklisted']
		}
	}

	// Else, no override
	return validationResults
}

function matchesEntry(value: string, entries: string[]): boolean {
	return entries.some((entry) => {
		if (entry.includes('@')) {
			// Full email match
			return entry.toLowerCase() === value.toLowerCase()
		}
		// Domain match
		return value.toLowerCase().endsWith(`@${entry.toLowerCase()}`)
	})
}
