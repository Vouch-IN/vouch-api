import { StripeError } from './errors.ts';
export async function getOrCreateCustomer(stripe, supabaseAdmin, userId, email) {
  // Check if user already has a Stripe customer
  const { data: existingCustomer } = await supabaseAdmin.from('stripe_customers').select('id').eq('user_id', userId).maybeSingle();
  if (existingCustomer) {
    console.log(`✅ Using existing customer: ${existingCustomer.id}`);
    return {
      customer_id: existingCustomer.id,
      is_new: false
    };
  }
  // Search Stripe by email
  const stripeCustomers = await stripe.customers.list({
    email: email,
    limit: 1
  });
  if (stripeCustomers.data.length > 0) {
    const customerId = stripeCustomers.data[0].id;
    console.log(`✅ Found existing Stripe customer: ${customerId}`);
    // Save to our DB
    const { error } = await supabaseAdmin.from('stripe_customers').upsert({
      id: customerId,
      user_id: userId,
      email: email
    }, {
      onConflict: 'id',
      ignoreDuplicates: true
    }).throwOnError();
    if (error) {
      console.error('Failed to save customer:', error);
    }
    return {
      customer_id: customerId,
      is_new: false
    };
  }
  // Create new customer
  try {
    const customer = await stripe.customers.create({
      email: email,
      metadata: {
        'user-id': userId
      }
    });
    const customerId = customer.id;
    await supabaseAdmin.from('stripe_customers').insert({
      id: customerId,
      user_id: userId,
      email: email
    }).throwOnError();
    console.log(`✅ New customer created: ${customerId}`);
    return {
      customer_id: customerId,
      is_new: true
    };
  } catch (error) {
    throw new StripeError(`Failed to create Stripe customer: ${error.message}`);
  }
}
export async function attachPaymentMethod(stripe, customerId, paymentMethodId, projectId) {
  try {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    });
    console.log(`✅ Payment method attached`);
  } catch (error) {
    if (error.code !== 'resource_already_exists') {
      throw new StripeError(`Failed to attach payment method: ${error.message}`);
    }
    console.log(`✅ Payment method already attached`);
  }
  // Update payment method metadata with project_id
  try {
    await stripe.paymentMethods.update(paymentMethodId, {
      metadata: {
        'project-id': projectId
      }
    });
    console.log(`✅ Payment method metadata updated with project ${projectId}`);
  } catch (error) {
    throw new StripeError(`Failed to update payment method metadata: ${error.message}`);
  }
  // Set as default payment method
  try {
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
    console.log(`✅ Set as default payment method`);
  } catch (error) {
    throw new StripeError(`Failed to set default payment method: ${error.message}`);
  }
}
