import { StripeError } from '../_shared/errors.ts'

export async function createBillingPortalSession(stripe, customerId, returnUrl) {
	try {
		const session = await stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: returnUrl
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
