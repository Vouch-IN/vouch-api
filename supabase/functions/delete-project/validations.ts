import { ValidationError } from './errors.ts'
export function validateRequest(body) {
	const { id } = body
	if (!id || typeof id !== 'string') {
		throw new ValidationError('id is required and must be a string')
	}
	return {
		id
	}
}
