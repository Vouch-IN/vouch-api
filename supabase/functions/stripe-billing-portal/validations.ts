import { ValidationError } from '../_shared/errors.ts'
import { isValidUUID } from '../_shared/validation.ts'

export interface CreateBillingPortalRequest {
	project_id: string
	return_url: string
}

export function validateRequest(body: unknown): CreateBillingPortalRequest {
	const { project_id, return_url } = body as Record<string, unknown>

	// Validate project_id (required)
	if (!project_id || typeof project_id !== 'string') {
		throw new ValidationError('project_id is required and must be a string')
	}

	if (!isValidUUID(project_id)) {
		throw new ValidationError('project_id must be a valid UUID')
	}

	// Validate return_url (required)
	if (!return_url || typeof return_url !== 'string') {
		throw new ValidationError('return_url is required and must be a string')
	}

	// URL validation
	try {
		new URL(return_url)
	} catch {
		throw new ValidationError('return_url must be a valid URL')
	}

	return {
		project_id,
		return_url
	}
}
