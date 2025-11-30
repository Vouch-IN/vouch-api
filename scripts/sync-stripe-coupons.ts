import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { Stripe } from 'stripe'

import type { Database } from '../src/types/database.types'

// Load from .dev.vars
config({ path: '.env' })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const STRIPE_API_KEY = process.env.STRIPE_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !STRIPE_API_KEY) {
	console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY or STRIPE_API_KEY in environment')
	process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY)

const stripe = new Stripe(STRIPE_API_KEY, {
	apiVersion: '2025-09-30.clover'
})

async function syncCoupons() {
	console.log('🔄 Fetching coupons from Stripe...')

	const coupons = await stripe.coupons.list({ expand: ['data.applies_to'], limit: 100 })

	let syncedCount = 0
	let errorCount = 0

	for (const coupon of coupons.data) {
		try {
			console.log(coupon.applies_to)
			// Extract applies_to product IDs if present
			const appliesToProductIds: string[] = []
			if (coupon.applies_to?.products && Array.isArray(coupon.applies_to.products)) {
				appliesToProductIds.push(...coupon.applies_to.products)
			}

			const { error } = await supabase.from('stripe_coupons').upsert(
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
					valid: coupon.valid !== false
				},
				{
					onConflict: 'id'
				}
			)

			if (error) {
				console.error(`❌ Error syncing coupon ${coupon.id}:`, error.message)
				errorCount++
			} else {
				console.log(`✅ Synced: ${coupon.id} - ${coupon.name || '(unnamed)'}`)
				syncedCount++
			}
		} catch (err) {
			console.error(`❌ Exception syncing coupon ${coupon.id}:`, err)
			errorCount++
		}
	}

	console.log('\n📊 Sync Summary:')
	console.log(`   ✅ Successfully synced: ${syncedCount}`)
	console.log(`   ❌ Errors: ${errorCount}`)
	console.log(`   📦 Total: ${coupons.data.length}`)
}

// Run the sync
void syncCoupons()
