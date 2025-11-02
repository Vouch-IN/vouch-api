import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@19.1.0'

import { deletePrice, upsertPrice } from './price.ts'
import { deleteProduct, upsertProduct } from './product.ts'
import { deleteSubscription, pauseSubscription, upsertSubscription } from './subscription.ts'
const stripeApiKey = Deno.env.get('STRIPE_API_KEY')
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!stripeApiKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
	throw new Error('Missing required environment variables')
}
const stripe = new Stripe(stripeApiKey, {
	apiVersion: '2025-09-30.clover'
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
console.log('Stripe Webhook Function booted!')
Deno.serve(async (request) => {
	const signature = request.headers.get('Stripe-Signature')
	const body = await request.text()
	if (!signature) {
		console.error('❌ Missing Stripe-Signature header')
		return new Response('Missing signature', {
			status: 400
		})
	}
	let event
	try {
		event = await stripe.webhooks.constructEventAsync(
			body,
			signature,
			stripeWebhookSecret,
			undefined,
			cryptoProvider
		)
	} catch (err) {
		console.error('❌ Webhook signature verification failed:', err.message)
		return new Response(err.message, {
			status: 400
		})
	}
	console.log(`🔔 ${event.type} (${event.id})`)
	try {
		switch (event.type) {
			// CHECKOUT SESSION
			case 'checkout.session.completed': {
				const session = event.data.object
				// When checkout is completed, Stripe automatically creates the subscription
				// We need to fetch it and sync it
				if (session.mode === 'subscription' && session.subscription) {
					const subscriptionId = typeof session.subscription === 'string'
						? session.subscription
						: session.subscription.id
					const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
						expand: ['items.data.price.product']
					})
					await upsertSubscription(supabaseAdmin, subscription)
				}
				break
			}
			// SUBSCRIPTION
			case 'customer.subscription.created':
			case 'customer.subscription.resumed':
			case 'customer.subscription.updated': {
				// Re-fetch with product expanded to ensure we have product name
				const subscription = await stripe.subscriptions.retrieve(event.data.object.id, {
					expand: ['items.data.price.product']
				})
				await upsertSubscription(supabaseAdmin, subscription)
				break
			}
			case 'customer.subscription.deleted':
				await deleteSubscription(supabaseAdmin, event.data.object)
				break
			case 'customer.subscription.paused':
				await pauseSubscription(supabaseAdmin, event.data.object)
				break
			// PRICE EVENTS
			case 'price.created':
			case 'price.updated':
				await upsertPrice(supabaseAdmin, event.data.object)
				break
			case 'price.deleted':
				await deletePrice(supabaseAdmin, event.data.object)
				break
			// PRODUCT EVENTS
			case 'product.created':
			case 'product.updated':
				await upsertProduct(stripe, supabaseAdmin, event.data.object)
				break
			case 'product.deleted':
				await deleteProduct(supabaseAdmin, event.data.object)
				break
			default:
				console.log(`ℹ️ Unhandled: ${event.type}`)
		}
		return new Response(
			JSON.stringify({ ok: true }),
			{
				headers: { 'Content-Type': 'application/json' },
				status: 200
			}
		)
	} catch (error) {
		console.error('❌ Handler error:', error)
		return new Response(
			JSON.stringify({ error: error.message }),
			{
				headers: { 'Content-Type': 'application/json' },
				status: 500
			}
		)
	}
})
