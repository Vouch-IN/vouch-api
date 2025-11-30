export async function deleteCoupon(supabaseAdmin, coupon) {
	// Soft delete coupon
	await supabaseAdmin
		.from('stripe_coupons')
		.update({
			deleted_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.eq('id', coupon.id)
		.throwOnError()

	console.log(`✅ Coupon ${coupon.id} soft deleted`)
}

export async function upsertCoupon(supabaseAdmin, coupon) {
	console.log(`🔄 Processing coupon ${coupon.id}`)

	// Extract applies_to product IDs if present
	const appliesToProductIds: string[] = []
	if (coupon.applies_to?.products && Array.isArray(coupon.applies_to.products)) {
		appliesToProductIds.push(...coupon.applies_to.products)
	}

	// Upsert coupon
	await supabaseAdmin
		.from('stripe_coupons')
		.upsert(
			{
				amount_off: coupon.amount_off || null,
				applies_to_product_ids: appliesToProductIds,
				currency: coupon.currency || null,
				duration: coupon.duration,
				duration_in_months: coupon.duration_in_months || null,
				id: coupon.id,
				max_redemptions: coupon.max_redemptions || null,
				metadata: coupon.metadata || {},
				name: coupon.name || null,
				percent_off: coupon.percent_off || null,
				redeem_by: coupon.redeem_by ? new Date(coupon.redeem_by * 1000).toISOString() : null,
				times_redeemed: coupon.times_redeemed || 0,
				updated_at: new Date().toISOString(),
				valid: coupon.valid !== false // Default to true if not explicitly false
			},
			{
				onConflict: 'id'
			}
		)
		.throwOnError()

	console.log(`✅ Coupon ${coupon.id} synced`)
}
