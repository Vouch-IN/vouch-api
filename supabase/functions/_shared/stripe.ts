/**
 * Shared Stripe utilities for checkout functions
 */
import Stripe from 'npm:stripe@19.1.0'

export function initStripe(): Stripe {
	const apiKey = Deno.env.get('STRIPE_API_KEY')
	if (!apiKey) {
		throw new Error('STRIPE_API_KEY environment variable is required')
	}
	return new Stripe(apiKey, {
		apiVersion: '2025-09-30.clover'
	})
}

/**
 * Get or create Stripe customer for a project
 */
export async function getOrCreateStripeCustomer(
	stripe: Stripe,
	project: { id: string; name: string; stripe_customer_id?: string | null },
	billingEmail: string
): Promise<string> {
	// If project already has a customer ID, use it
	if (project.stripe_customer_id) {
		console.log(`✅ Using existing Stripe customer: ${project.stripe_customer_id}`)
		return project.stripe_customer_id
	}

	// Create new Stripe customer
	const customer = await stripe.customers.create({
		email: billingEmail,
		metadata: {
			project_id: project.id,
			project_name: project.name
		}
	})

	console.log(`✅ Created Stripe customer: ${customer.id}`)
	return customer.id
}

/**
 * Create a Stripe Checkout Session
 */
export async function createCheckoutSession(
	stripe: Stripe,
	customerId: string,
	priceId: string,
	successUrl: string,
	cancelUrl: string
): Promise<{ sessionId: string; sessionUrl: string }> {
	const session = await stripe.checkout.sessions.create({
		customer: customerId,
		payment_method_types: ['card'],
		line_items: [
			{
				price: priceId,
				quantity: 1
			}
		],
		mode: 'subscription',
		success_url: successUrl,
		cancel_url: cancelUrl,
		allow_promotion_codes: true,
		billing_address_collection: 'auto'
	})

	console.log(`✅ Created checkout session: ${session.id}`)

	if (!session.url) {
		throw new Error('Checkout session URL is null')
	}

	return {
		sessionId: session.id,
		sessionUrl: session.url
	}
}
