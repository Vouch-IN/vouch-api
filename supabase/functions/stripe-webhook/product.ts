export async function upsertProduct(stripe, supabaseAdmin, product) {
  const metadata = product.metadata || {};
  const validationsLimit = parseInt(metadata['validation-limit']) || null;
  const logRetentionDays = parseInt(metadata['log-retention']) || null;
  const teamLimit = parseInt(metadata['team-limit']) || null;
  const marketingFeatures = product.marketing_features?.map((f)=>f.name) || [];
  let features = [];
  try {
    const featuresResponse = await stripe.products.listFeatures(product.id);
    features = featuresResponse.data.filter((f)=>f.entitlement_feature?.lookup_key).map((f)=>f.entitlement_feature.lookup_key);
  } catch (error) {
    console.error(`⚠️ Could not fetch features for product ${product.id}:`, error);
  }
  const entitlements = {
    validations_limit: validationsLimit,
    team_limit: teamLimit,
    log_retention_days: logRetentionDays,
    features: features
  };
  await supabaseAdmin.from('stripe_products').upsert({
    id: product.id,
    name: product.name,
    description: product.description,
    active: product.active,
    metadata: product.metadata,
    entitlements: entitlements,
    marketing_features: marketingFeatures,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'id'
  }).throwOnError();
  console.log(`✅ Product ${product.id} synced`);
}
export async function deleteProduct(supabaseAdmin, product) {
  await supabaseAdmin.from('stripe_products').update({
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', product.id).throwOnError();
  console.log(`✅ Product ${product.id} soft deleted`);
}
