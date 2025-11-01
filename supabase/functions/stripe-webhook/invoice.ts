export async function handleInvoiceChange(supabaseAdmin, invoice, overrides = {}) {
  await new Promise((resolve)=>setTimeout(resolve, 2000));
  const projectId = invoice.subscription_details?.metadata?.['project-id'];
  if (!projectId) {
    console.log('⚠️ No project_id in invoice metadata');
    return;
  }
  const paidAt = invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : null;
  await supabaseAdmin.from('stripe_invoices').upsert({
    id: invoice.id,
    project_id: projectId,
    stripe_subscription_id: invoice.subscription,
    amount_paid: invoice.amount_paid,
    amount_due: invoice.amount_due,
    currency: invoice.currency,
    status: overrides.status ?? invoice.status,
    paid_at: paidAt,
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
    pdf_url: invoice.invoice_pdf
  }, {
    onConflict: 'id'
  }).throwOnError();
  console.log(`✅ Invoice updated: ${invoice.id}`);
}
