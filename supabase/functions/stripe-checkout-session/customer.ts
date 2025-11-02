import { StripeError } from '../_shared/errors.ts'

/**
 * Get existing customer ID from project or create a new one
 * If project has stripe_customer_id, return it
 * Otherwise, create a new customer with project-id in metadata
 */
export async function getOrCreateStripeCustomer(stripe, project, email) {
	// If project already has a customer ID, return it
	if (project.stripe_customer_id) {
		console.log(`✅ Using existing Stripe customer: ${project.stripe_customer_id}`)
		return project.stripe_customer_id
	}

	// Create new customer
	try {
		const customer = await stripe.customers.create({
			email,
			metadata: {
				'project-id': project.id
			}
		})
		console.log(`✅ Stripe customer created: ${customer.id}`)
		return customer.id
	} catch (error) {
		throw new StripeError(`Failed to create Stripe customer: ${error.message}`)
	}
}
