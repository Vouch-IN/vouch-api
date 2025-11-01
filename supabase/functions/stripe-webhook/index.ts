import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@19.1.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { upsertCustomer, deleteCustomer } from './customer.ts';
import { upsertSubscription, deleteSubscription, pauseSubscription } from './subscription.ts';
import { upsertPaymentMethod, detachPaymentMethod } from './payment-method.ts';
import { upsertProduct, deleteProduct } from './product.ts';
import { handleInvoiceChange } from './invoice.ts';
import { upsertPrice, deletePrice } from './price.ts';
const stripeApiKey = Deno.env.get('STRIPE_API_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!stripeApiKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables');
}
const stripe = new Stripe(stripeApiKey, {
  apiVersion: '2025-09-30.clover'
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
console.log('Stripe Webhook Function booted!');
Deno.serve(async (request)=>{
  const signature = request.headers.get('Stripe-Signature');
  const body = await request.text();
  if (!signature) {
    console.error('❌ Missing Stripe-Signature header');
    return new Response('Missing signature', {
      status: 400
    });
  }
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret, undefined, cryptoProvider);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return new Response(err.message, {
      status: 400
    });
  }
  console.log(`🔔 ${event.type} (${event.id})`);
  try {
    switch(event.type){
      // CUSTOMER
      case 'customer.created':
      case 'customer.updated':
        await upsertCustomer(supabaseAdmin, event.data.object);
        break;
      case 'customer.deleted':
        await deleteCustomer(supabaseAdmin, event.data.object);
        break;
      // SUBSCRIPTION
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.resumed':
        await upsertSubscription(supabaseAdmin, event.data.object);
        break;
      case 'customer.subscription.deleted':
        await deleteSubscription(supabaseAdmin, event.data.object);
        break;
      case 'customer.subscription.paused':
        await pauseSubscription(supabaseAdmin, event.data.object);
        break;
      // PAYMENT METHOD
      case 'payment_method.attached':
        console.log(`ℹ️ Payment method attached, waiting for metadata update`);
        break;
      case 'payment_method.updated':
      case 'payment_method.automatically_updated':
        await upsertPaymentMethod(supabaseAdmin, event.data.object);
        break;
      case 'payment_method.detached':
        await detachPaymentMethod(supabaseAdmin, event.data.object);
        break;
      case 'invoice.created':
      case 'invoice.updated':
        await handleInvoiceChange(supabaseAdmin, event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoiceChange(supabaseAdmin, event.data.object, {
          status: 'open'
        });
        break;
      case 'invoice.sent':
        await handleInvoiceChange(supabaseAdmin, event.data.object, {
          status: 'open'
        });
        break;
      case 'invoice.voided':
        await handleInvoiceChange(supabaseAdmin, event.data.object, {
          status: 'void'
        });
        break;
      case 'invoice.marked_uncollectible':
        await handleInvoiceChange(supabaseAdmin, event.data.object, {
          status: 'uncollectible'
        });
        break;
      case 'invoice.finalized':
        await handleInvoiceChange(supabaseAdmin, event.data.object, {
          status: 'open'
        });
        break;
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await handleInvoiceChange(supabaseAdmin, event.data.object, {
          status: 'paid'
        });
        break;
      // PRODUCT EVENTS
      case 'product.created':
      case 'product.updated':
        await upsertProduct(stripe, supabaseAdmin, event.data.object);
        break;
      case 'product.deleted':
        await deleteProduct(supabaseAdmin, event.data.object);
        break;
      // PRICE EVENTS
      case 'price.created':
      case 'price.updated':
        await upsertPrice(supabaseAdmin, event.data.object);
        break;
      case 'price.deleted':
        await deletePrice(supabaseAdmin, event.data.object);
        break;
      default:
        console.log(`ℹ️ Unhandled: ${event.type}`);
    }
    return new Response(JSON.stringify({
      ok: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Handler error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
