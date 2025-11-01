import { StripeError } from './errors.ts'
export async function attachPaymentMethod(stripe, customerId, paymentMethodId) {
	try {
		await stripe.paymentMethods.attach(paymentMethodId, {
			customer: customerId
		})
		console.log(`✅ Payment method attached`)
	} catch (error) {
		if (error.code !== 'resource_already_exists') {
			throw new StripeError(`Failed to attach payment method: ${error.message}`)
		}
		console.log(`✅ Payment method already attached`)
	}
	// Set as default payment method
	try {
		await stripe.customers.update(customerId, {
			invoice_settings: {
				default_payment_method: paymentMethodId
			}
		})
		console.log(`✅ Set as default payment method`)
	} catch (error) {
		throw new StripeError(`Failed to set default payment method: ${error.message}`)
	}
}
export async function createStripeCustomer(stripe, supabaseAdmin, email, metadata) {
	// Create new customer
	try {
		const customer = await stripe.customers.create({
			email,
			metadata: {
				'owner-id': metadata.owner_id,
				'project-id': metadata.project_id
			}
		})
		return customer.id
	} catch (error) {
		throw new StripeError(`Failed to create Stripe customer: ${error.message}`)
	}
}
