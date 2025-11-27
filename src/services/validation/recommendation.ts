import { type CheckResult, ValidationAction, type ValidationToggles } from '../../types'

/**
 * Determine the final recommendation (ALLOW/FLAG/BLOCK) based on validation results
 *
 * Priority:
 * 1. Whitelist → ALLOW (overrides everything)
 * 2. Blacklist → BLOCK (overrides everything except whitelist)
 * 3. Failed validation with BLOCK action → BLOCK
 * 4. Failed validation with FLAG action → FLAG
 * 5. All passed → ALLOW
 */
export function determineRecommendation(
	enabledValidations: ValidationToggles,
	checks: Record<string, CheckResult>
): ValidationAction {
	// Whitelist always wins (highest priority)
	if (checks.whitelist?.pass) {
		return ValidationAction.ALLOW
	}

	// Blacklist takes priority over all other checks
	if (checks.blacklist?.pass) {
		return ValidationAction.BLOCK
	}

	// Check if any validation failed AND is configured to BLOCK
	const shouldBlock = Object.keys(checks).some((key) => {
		const check = checks[key]
		const action = enabledValidations[key as keyof ValidationToggles]
		// Must fail the check AND be configured to block
		return !check.pass && action === ValidationAction.BLOCK
	})

	if (shouldBlock) {
		return ValidationAction.BLOCK
	}

	// Check if any validation failed AND is configured to FLAG
	const shouldFlag = Object.keys(checks).some((key) => {
		const check = checks[key]
		const action = enabledValidations[key as keyof ValidationToggles]
		// Must fail the check AND be configured to flag
		return !check.pass && action === ValidationAction.FLAG
	})

	if (shouldFlag) {
		return ValidationAction.FLAG
	}

	// All validations passed or were inactive
	return ValidationAction.ALLOW
}
