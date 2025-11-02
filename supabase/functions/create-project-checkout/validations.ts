import { ValidationError } from '../_shared/errors.ts'
import { isValidEmail } from '../_shared/validation.ts'

export interface CreateProjectCheckoutRequest {
	project_name: string
	project_slug?: string
	billing_email: string
	is_free: boolean
	price_id?: string
	success_url?: string
	cancel_url?: string
}

export function validateRequest(body: unknown): CreateProjectCheckoutRequest {
	const {
		project_name,
		project_slug,
		billing_email,
		is_free,
		price_id,
		success_url,
		cancel_url
	} = body as Record<string, unknown>

	// Validate project_name (always required)
	if (!project_name || typeof project_name !== 'string' || project_name.trim().length === 0) {
		throw new ValidationError('project_name is required and must be a non-empty string')
	}

	if (project_name.length > 100) {
		throw new ValidationError('project_name must be 100 characters or less')
	}

	// Validate project_slug (optional, but must be valid format if provided)
	if (project_slug !== undefined) {
		if (typeof project_slug !== 'string') {
			throw new ValidationError('project_slug must be a string')
		}

		if (project_slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project_slug)) {
			throw new ValidationError(
				'project_slug must contain only lowercase letters, numbers, and hyphens (no spaces or special characters)'
			)
		}

		if (project_slug.length > 63) {
			throw new ValidationError('project_slug must be 63 characters or less')
		}
	}

	// Validate billing_email (always required)
	if (!billing_email || typeof billing_email !== 'string') {
		throw new ValidationError('billing_email is required and must be a string')
	}

	if (!isValidEmail(billing_email)) {
		throw new ValidationError('billing_email must be a valid email address')
	}

	// Validate is_free flag
	if (typeof is_free !== 'boolean') {
		throw new ValidationError('is_free is required and must be a boolean')
	}

	// If not free tier, validate payment fields
	if (!is_free) {
		// price_id is required for paid tier
		if (!price_id || typeof price_id !== 'string') {
			throw new ValidationError('price_id is required for paid subscriptions')
		}

		// success_url is required for paid tier
		if (!success_url || typeof success_url !== 'string') {
			throw new ValidationError('success_url is required for paid subscriptions')
		}

		// cancel_url is required for paid tier
		if (!cancel_url || typeof cancel_url !== 'string') {
			throw new ValidationError('cancel_url is required for paid subscriptions')
		}

		// Validate URLs
		try {
			new URL(success_url)
		} catch {
			throw new ValidationError('success_url must be a valid URL')
		}

		try {
			new URL(cancel_url)
		} catch {
			throw new ValidationError('cancel_url must be a valid URL')
		}
	}

	return {
		project_name: project_name.trim(),
		project_slug: project_slug || undefined,
		billing_email: billing_email.trim().toLowerCase(),
		is_free,
		price_id: price_id as string | undefined,
		success_url: success_url as string | undefined,
		cancel_url: cancel_url as string | undefined
	}
}
