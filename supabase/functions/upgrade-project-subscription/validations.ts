import { ValidationError } from '../_shared/errors.ts'
import { isValidUUID } from '../_shared/validation.ts'

export interface UpgradeProjectSubscriptionRequest {
	project_id: string
	price_id: string
	success_url: string
	cancel_url: string
}

export function validateRequest(body: unknown): UpgradeProjectSubscriptionRequest {
	const {
		project_id,
		price_id,
		success_url,
		cancel_url
	} = body as Record<string, unknown>

	// Validate project_id (required)
	if (!project_id || typeof project_id !== 'string') {
		throw new ValidationError('project_id is required and must be a string')
	}

	if (!isValidUUID(project_id)) {
		throw new ValidationError('project_id must be a valid UUID')
	}

	// Validate price_id (required)
	if (!price_id || typeof price_id !== 'string') {
		throw new ValidationError('price_id is required and must be a string')
	}

	if (price_id.length === 0) {
		throw new ValidationError('price_id cannot be empty')
	}

	// Validate success_url (required)
	if (!success_url || typeof success_url !== 'string') {
		throw new ValidationError('success_url is required and must be a string')
	}

	try {
		new URL(success_url)
	} catch {
		throw new ValidationError('success_url must be a valid URL')
	}

	// Validate cancel_url (required)
	if (!cancel_url || typeof cancel_url !== 'string') {
		throw new ValidationError('cancel_url is required and must be a string')
	}

	try {
		new URL(cancel_url)
	} catch {
		throw new ValidationError('cancel_url must be a valid URL')
	}

	return {
		project_id,
		price_id,
		success_url,
		cancel_url
	}
}
