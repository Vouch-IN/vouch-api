export async function upsertPrice(supabaseAdmin, price) {
  const productId = typeof price.product === 'string' ? price.product : price.product.id;
  await supabaseAdmin.from('stripe_prices').upsert({
    id: price.id,
    product_id: productId,
    nickname: price.nickname,
    currency: price.currency,
    unit_amount: price.unit_amount,
    recurring_interval: price.recurring?.interval,
    recurring_interval_count: price.recurring?.interval_count,
    type: price.type,
    lookup_key: price.lookup_key,
    active: price.active,
    metadata: price.metadata,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'id'
  }).throwOnError();
  console.log(`✅ Price ${price.id} synced`);
}
export async function deletePrice(supabaseAdmin, price) {
  await supabaseAdmin.from('stripe_prices').update({
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', price.id).throwOnError();
  console.log(`✅ Price ${price.id} soft deleted`);
}
