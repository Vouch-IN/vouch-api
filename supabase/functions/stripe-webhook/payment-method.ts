export async function upsertPaymentMethod(supabaseAdmin, paymentMethod) {
  const customerId = typeof paymentMethod.customer === 'string' ? paymentMethod.customer : paymentMethod.customer?.id;
  if (!customerId) {
    console.error('❌ No customer for payment method');
    return;
  }
  const projectId = paymentMethod.metadata?.['project-id'];
  if (!projectId) {
    console.error(`❌ No project-id in payment method metadata`);
    return;
  }
  await supabaseAdmin.from('stripe_payment_methods').upsert({
    id: paymentMethod.id,
    stripe_customer_id: customerId,
    project_id: projectId,
    type: paymentMethod.type,
    billing_details: paymentMethod.billing_details,
    card_brand: paymentMethod.card?.brand,
    card_last4: paymentMethod.card?.last4,
    exp_month: paymentMethod.card?.exp_month,
    exp_year: paymentMethod.card?.exp_year,
    is_default: true,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'id'
  }).throwOnError();
  console.log(`✅ Payment method ${paymentMethod.id} synced`);
}
export async function detachPaymentMethod(supabaseAdmin, paymentMethod) {
  await supabaseAdmin.from('stripe_payment_methods').update({
    detached_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', paymentMethod.id).throwOnError();
  console.log(`✅ Payment method ${paymentMethod.id} detached`);
}
