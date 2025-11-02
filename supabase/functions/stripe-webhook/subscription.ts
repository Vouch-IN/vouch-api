import { getEntitlementsFromPrice } from './utils.ts'

export async function deleteSubscription(supabaseAdmin, subscription) {
	// Soft delete subscription
	await supabaseAdmin
		.from('stripe_subscriptions')
		.update({
			deleted_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.eq('id', subscription.id)
		.throwOnError()
	// Get project_id to find entitlement
	const { data: sub } = await supabaseAdmin
		.from('stripe_subscriptions')
		.select('project_id')
		.eq('id', subscription.id)
		.single()
	if (sub) {
		// End the entitlement
		await supabaseAdmin
			.from('entitlements')
			.update({
				ends_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.eq('project_id', sub.project_id)
			.eq('source', 'stripe')
			.throwOnError()
	}
	console.log(`✅ Subscription ${subscription.id} soft deleted`)
}
export async function pauseSubscription(supabaseAdmin, subscription) {
	// Pause subscription
	await supabaseAdmin
		.from('stripe_subscriptions')
		.update({
			status: 'paused',
			updated_at: new Date().toISOString()
		})
		.eq('id', subscription.id)
		.throwOnError()
	// Get project_id to find entitlement
	const { data: sub } = await supabaseAdmin
		.from('stripe_subscriptions')
		.select('project_id')
		.eq('id', subscription.id)
		.single()
	if (sub) {
		// End the entitlement
		await supabaseAdmin
			.from('entitlements')
			.update({
				ends_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.eq('project_id', sub.project_id)
			.eq('source', 'stripe')
			.throwOnError()
	}
	console.log(`✅ Subscription ${subscription.id} paused`)
}
export async function upsertSubscription(supabaseAdmin, subscription) {
	// Get customer ID from subscription
	const customerId = subscription.customer
	if (!customerId) {
		throw new Error(`No customer ID in subscription ${subscription.id}`)
	}

	// Look up project by stripe_customer_id
	const { data: project } = await supabaseAdmin
		.from('projects')
		.select('id')
		.eq('stripe_customer_id', customerId)
		.maybeSingle()

	if (!project) {
		throw new Error(
			`Project not found for customer ${customerId} - it should have been created before subscription`
		)
	}

	const projectId = project.id

	// Get price and product details
	const priceData = subscription.items.data[0]?.price
	const priceId = priceData?.id
	const productData = priceData?.product
	const productId = typeof productData === 'string' ? productData : productData?.id

	// Fix product name - handle both expanded object and string ID
	let productName = null
	if (typeof productData === 'object' && productData?.name) {
		productName = productData.name
	}

	// Get entitlements
	const entitlements = await getEntitlementsFromPrice(supabaseAdmin, priceId)
	if (!entitlements) {
		throw new Error(`Could not fetch entitlements for price ${priceId}`)
	}
	const periodStart = new Date(subscription.current_period_start * 1000).toISOString()
	const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

	// Find existing entitlement for this project from stripe source
	const { data: existingEntitlement } = await supabaseAdmin
		.from('entitlements')
		.select('id')
		.eq('project_id', projectId)
		.eq('source', 'stripe')
		.maybeSingle()

	let entitlement
	if (existingEntitlement) {
		// Update existing entitlement
		const { data } = await supabaseAdmin
			.from('entitlements')
			.update({
				ends_at: periodEnd,
				features: entitlements.features,
				log_retention_days: entitlements.log_retention_days,
				starts_at: periodStart,
				team_limit: entitlements.team_limit,
				updated_at: new Date().toISOString(),
				validations_limit: entitlements.validations_limit
			})
			.eq('id', existingEntitlement.id)
			.select()
			.single()
			.throwOnError()
		entitlement = data
	} else {
		// Create new entitlement
		const { data } = await supabaseAdmin
			.from('entitlements')
			.insert({
				ends_at: periodEnd,
				features: entitlements.features,
				log_retention_days: entitlements.log_retention_days,
				project_id: projectId,
				source: 'stripe',
				starts_at: periodStart,
				team_limit: entitlements.team_limit,
				validations_limit: entitlements.validations_limit
			})
			.select()
			.single()
			.throwOnError()
		entitlement = data
	}

	// Upsert subscription
	await supabaseAdmin
		.from('stripe_subscriptions')
		.upsert(
			{
				amount: priceData?.unit_amount || 0,
				cancel_at_period_end: subscription.cancel_at_period_end,
				canceled_at: subscription.canceled_at
					? new Date(subscription.canceled_at * 1000).toISOString()
					: null,
				currency: priceData?.currency || 'usd',
				current_period_end: periodEnd,
				current_period_start: periodStart,
				entitlement_id: entitlement?.id || null,
				id: subscription.id,
				interval: priceData?.recurring?.interval || null,
				interval_count: priceData?.recurring?.interval_count || null,
				metadata: subscription.metadata || {},
				price_id: priceId,
				product_id: productId,
				product_name: productName,
				project_id: projectId,
				status: subscription.status,
				trial_end: subscription.trial_end
					? new Date(subscription.trial_end * 1000).toISOString()
					: null,
				trial_start: subscription.trial_start
					? new Date(subscription.trial_start * 1000).toISOString()
					: null,
				updated_at: new Date().toISOString()
			},
			{
				onConflict: 'id'
			}
		)
		.throwOnError()
	console.log(`✅ Subscription ${subscription.id} synced for project ${projectId}`)
}
