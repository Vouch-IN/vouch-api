import { getEntitlementsFromPrice, getMetadataValue } from './utils.ts';
export async function upsertSubscription(supabaseAdmin, subscription) {
  const projectId = getMetadataValue(subscription.metadata, 'project-id');
  if (!projectId) {
    console.error(`❌ No project-id in subscription metadata`);
    return;
  }
  // Check if project exists
  const { data: project } = await supabaseAdmin.from('projects').select('id').eq('id', projectId).maybeSingle();
  if (!project) {
    console.error(`❌ Project ${projectId} not found - it should have been created before subscription`);
    return;
  }
  // Get price and product details
  const priceData = subscription.items.data[0]?.price;
  const priceId = priceData?.id;
  const productData = priceData?.product;
  const productId = typeof productData === 'string' ? productData : productData?.id;
  const productName = typeof productData === 'object' ? productData?.name : null;

  // Get entitlements
  const entitlements = await getEntitlementsFromPrice(supabaseAdmin, priceId);
  if (!entitlements) {
    console.error(`❌ Could not fetch entitlements for price ${priceId}`);
    return;
  }
  const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // Find existing entitlement for this project from stripe source
  const { data: existingEntitlement } = await supabaseAdmin
    .from('entitlements')
    .select('id')
    .eq('project_id', projectId)
    .eq('source', 'stripe')
    .maybeSingle();

  let entitlement;
  if (existingEntitlement) {
    // Update existing entitlement
    const { data } = await supabaseAdmin.from('entitlements').update({
      validations_limit: entitlements.validations_limit,
      log_retention_days: entitlements.log_retention_days,
      features: entitlements.features,
      starts_at: periodStart,
      ends_at: periodEnd,
      updated_at: new Date().toISOString()
    }).eq('id', existingEntitlement.id).select().single().throwOnError();
    entitlement = data;
  } else {
    // Create new entitlement
    const { data } = await supabaseAdmin.from('entitlements').insert({
      project_id: projectId,
      source: 'stripe',
      validations_limit: entitlements.validations_limit,
      log_retention_days: entitlements.log_retention_days,
      features: entitlements.features,
      starts_at: periodStart,
      ends_at: periodEnd
    }).select().single().throwOnError();
    entitlement = data;
  }

  // Upsert subscription
  await supabaseAdmin.from('stripe_subscriptions').upsert({
    id: subscription.id,
    project_id: projectId,
    product_name: productName,
    product_id: productId,
    price_id: priceId,
    amount: priceData?.unit_amount || 0,
    currency: priceData?.currency || 'usd',
    interval: priceData?.recurring?.interval || null,
    interval_count: priceData?.recurring?.interval_count || null,
    status: subscription.status,
    entitlement_id: entitlement?.id || null,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    metadata: subscription.metadata || {},
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'id'
  }).throwOnError();
  console.log(`✅ Subscription ${subscription.id} synced for project ${projectId}`);
}
export async function deleteSubscription(supabaseAdmin, subscription) {
  // Soft delete subscription
  await supabaseAdmin.from('stripe_subscriptions').update({
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', subscription.id).throwOnError();
  // Get project_id to find entitlement
  const { data: sub } = await supabaseAdmin.from('stripe_subscriptions').select('project_id').eq('id', subscription.id).single();
  if (sub) {
    // End the entitlement
    await supabaseAdmin.from('entitlements').update({
      ends_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('project_id', sub.project_id).eq('source', 'stripe').throwOnError();
  }
  console.log(`✅ Subscription ${subscription.id} soft deleted`);
}
export async function pauseSubscription(supabaseAdmin, subscription) {
  // Pause subscription
  await supabaseAdmin.from('stripe_subscriptions').update({
    status: 'paused',
    updated_at: new Date().toISOString()
  }).eq('id', subscription.id).throwOnError();
  // Get project_id to find entitlement
  const { data: sub } = await supabaseAdmin.from('stripe_subscriptions').select('project_id').eq('id', subscription.id).single();
  if (sub) {
    // End the entitlement
    await supabaseAdmin.from('entitlements').update({
      ends_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('project_id', sub.project_id).eq('source', 'stripe').throwOnError();
  }
  console.log(`✅ Subscription ${subscription.id} paused`);
}
