import type { ValidationResults } from '../../types'
import { ValidationAction } from '../../types'

/**
 * Creates a validation helper that automatically handles error handling,
 * BLOCK failure propagation, and routing to appropriate promise arrays.
 */
export function createValidationHelper(
	blockValidationPromises: Promise<void>[],
	flagValidationPromises: Promise<void>[],
	results: ValidationResults
) {
	return (
		action: ValidationAction,
		checkName: string,
		validationFn: () => Promise<boolean> // Returns true if validation should block
	) => {
		if (action === ValidationAction.INACTIVE) return

		const promise = (async () => {
			const startTime = performance.now()
			try {
				const shouldBlock = await validationFn()
				if (action === ValidationAction.BLOCK && shouldBlock) {
					throw new Error('BLOCK_VALIDATION_FAILED')
				}
			} catch (error) {
				if (error instanceof Error && error.message === 'BLOCK_VALIDATION_FAILED') {
					throw error
				}
				// For other errors, record but don't block
				results.checks[checkName] = {
					error: `${checkName}_check_failed`,
					latency: performance.now() - startTime,
					pass: true
				}
			}
		})()

		// Route to appropriate array
		;(action === ValidationAction.BLOCK ? blockValidationPromises : flagValidationPromises).push(
			promise
		)
	}
}
