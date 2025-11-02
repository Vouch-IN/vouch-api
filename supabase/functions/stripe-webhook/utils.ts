export async function getEntitlementsFromPrice(supabaseAdmin, priceId) {
	if (!priceId) return null
	try {
		const { data: price } = await supabaseAdmin
			.from('stripe_prices')
			.select(
				`
        id,
        product:stripe_products!inner(
          id,
          entitlements
        )
      `
			)
			.eq('id', priceId)
			.is('deleted_at', null)
			.is('stripe_products.deleted_at', null)
			.single()
			.throwOnError()
		if (price?.product?.entitlements) {
			const ent = price.product.entitlements
			if (ent.validations_limit && ent.log_retention_days && ent.team_limit) {
				return {
					features: ent.features || [],
					log_retention_days: ent.log_retention_days,
					team_limit: ent.team_limit,
					validations_limit: ent.validations_limit
				}
			}
		}
		console.error(`❌ Invalid entitlements for price ${priceId}`)
		return null
	} catch (error) {
		console.error('❌ Error fetching entitlements:', error)
		return null
	}
}
export function getMetadataValue(metadata, key) {
	if (!metadata) return undefined
	// Try kebab-case first, fallback to snake_case
	return metadata[key] || metadata[key.replace(/-/g, '_')]
}
