import { ValidationError } from '../_shared/errors.ts'

export function validateRequest(body) {
	const { project_id, return_url } = body
	// project_id is required
	if (!project_id || typeof project_id !== 'string') {
		throw new ValidationError('project_id is required and must be a string')
	}

	if (!return_url || typeof return_url !== 'string') {
		throw new ValidationError('return_url is required and must be a string')
	}

	// URL validation
	try {
		new URL(return_url)
	} catch {
		throw new ValidationError('Invalid URL format for return_url')
	}

	return {
		project_id,
		return_url
	}
}
