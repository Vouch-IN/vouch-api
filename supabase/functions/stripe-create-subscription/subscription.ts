import { StripeError, ValidationError } from './errors.ts'
export async function createSubscription(stripe, customerId, priceId, metadata) {
	try {
		const subscription = await stripe.subscriptions.create({
			customer: customerId,
			expand: ['latest_invoice.payment_intent'],
			items: [
				{
					price: priceId
				}
			],
			metadata: {
				'billing-email': metadata.billing_email,
				'owner-id': metadata.owner_id,
				'project-id': metadata.project_id
			},
			payment_settings: {
				payment_method_types: ['card'],
				save_default_payment_method: 'on_subscription'
			}
		})
		const invoice = subscription.latest_invoice
		const paymentIntent = invoice.payment_intent
		console.log(`✅ Subscription created: ${subscription.id}`)
		return {
			clientSecret: paymentIntent?.client_secret || null,
			status: subscription.status,
			subscriptionId: subscription.id
		}
	} catch (error) {
		throw new StripeError(`Failed to create subscription: ${error.message}`)
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
