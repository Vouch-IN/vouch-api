import { StripeError } from './errors.ts'

/**
 * Create a Stripe customer with project-id in metadata
 * This is created BEFORE the project exists in our database
 */
export async function createStripeCustomer(stripe, email, projectId) {
	try {
		const customer = await stripe.customers.create({
			email,
			metadata: {
				'project-id': projectId
			}
		})
		console.log(`✅ Stripe customer created: ${customer.id}`)
		return customer.id
	} catch (error) {
		throw new StripeError(`Failed to create Stripe customer: ${error.message}`)
	}
}
