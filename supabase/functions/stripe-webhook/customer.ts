import { getMetadataValue } from './utils.ts';
export async function upsertCustomer(supabaseAdmin, customer) {
  const userId = getMetadataValue(customer.metadata, 'user-id');
  if (!userId) {
    console.log(`⚠️ Customer ${customer.id} has no user-id in metadata - skipping`);
    return;
  }
  await supabaseAdmin.from('stripe_customers').upsert({
    id: customer.id,
    user_id: userId,
    email: customer.email,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'id'
  }).throwOnError();
  console.log(`✅ Customer ${customer.id} synced`);
}
export async function deleteCustomer(supabaseAdmin, customer) {
  await supabaseAdmin.from('stripe_customers').delete().eq('id', customer.id).throwOnError();
  console.log(`✅ Customer ${customer.id} deleted`);
}
