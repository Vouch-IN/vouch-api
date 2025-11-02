import type Stripe from 'npm:stripe@19.1.0'

import { StripeError } from '../_shared/errors.ts'

export async function createBillingPortalSession(
	stripe: Stripe,
	customerId: string,
	returnUrl: string
): Promise<{ sessionId: string; sessionUrl: string }> {
	try {
		const session = await stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: returnUrl
		})
		console.log(`✅ Billing portal session created: ${session.id}`)
		return {
			sessionId: session.id,
			sessionUrl: session.url
		}
	} catch (error) {
		throw new StripeError(`Failed to create billing portal session: ${error.message}`)
	}
}
