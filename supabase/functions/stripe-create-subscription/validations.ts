import { ValidationError } from './errors.ts'

export function validateRequest(body) {
	const {
		billing_email,
		cancel_url,
		owner_id,
		price_id,
		project_id,
		project_name,
		project_slug,
		success_url
	} = body

	if (!project_id || typeof project_id !== 'string') {
		throw new ValidationError('project_id is required and must be a string')
	}
	if (!project_slug || typeof project_slug !== 'string') {
		throw new ValidationError('project_slug is required and must be a string')
	}
	if (!project_name || typeof project_name !== 'string') {
		throw new ValidationError('project_name is required and must be a string')
	}
	if (!owner_id || typeof owner_id !== 'string') {
		throw new ValidationError('owner_id is required and must be a string')
	}
	if (!billing_email || typeof billing_email !== 'string') {
		throw new ValidationError('billing_email is required and must be a string')
	}
	if (!price_id || typeof price_id !== 'string') {
		throw new ValidationError('price_id is required and must be a string')
	}
	if (!success_url || typeof success_url !== 'string') {
		throw new ValidationError('success_url is required and must be a string')
	}
	if (!cancel_url || typeof cancel_url !== 'string') {
		throw new ValidationError('cancel_url is required and must be a string')
	}

	// Basic email validation
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing_email)) {
		throw new ValidationError('Invalid email format')
	}

	// Slug format check
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project_slug)) {
		throw new ValidationError('Invalid slug format')
	}

	// URL validation
	try {
		new URL(success_url)
		new URL(cancel_url)
	} catch {
		throw new ValidationError('Invalid URL format for success_url or cancel_url')
	}

	return {
		billing_email,
		cancel_url,
		owner_id,
		price_id,
		project_id,
		project_name,
		project_slug,
		success_url
	}
}
