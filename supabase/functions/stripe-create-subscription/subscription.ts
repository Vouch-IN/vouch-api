import { StripeError, ValidationError } from './errors.ts'

/**
 * Create a Stripe Checkout Session
 * The subscription will be created automatically when the user completes checkout
 * Webhook will handle connecting it to the project via customer ID
 */
export async function createCheckoutSession(stripe, customerId, priceId, successUrl, cancelUrl) {
	try {
		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			line_items: [
				{
					price: priceId,
					quantity: 1
				}
			],
			mode: 'subscription',
			success_url: successUrl,
			cancel_url: cancelUrl,
			payment_method_types: ['card'],
			billing_address_collection: 'auto',
			allow_promotion_codes: true
		})
		console.log(`✅ Checkout session created: ${session.id}`)
		return {
			sessionId: session.id,
			sessionUrl: session.url
		}
	} catch (error) {
		throw new StripeError(`Failed to create checkout session: ${error.message}`)
	}
}

export async function validateProject(supabaseAdmin, projectId, projectSlug) {
	// Check if project already exists
	const [result1, result2] = await Promise.all([
		supabaseAdmin.from('projects').select('id').eq('id', projectId).maybeSingle(),
		supabaseAdmin.from('projects').select('id').eq('slug', projectSlug).maybeSingle()
	])
	if (result1.data || result2.data) {
		throw new ValidationError('Project already exists')
	}
}
