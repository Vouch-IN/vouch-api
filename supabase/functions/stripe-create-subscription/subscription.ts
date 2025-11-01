import { StripeError, ValidationError } from './errors.ts';
export async function validateProject(supabaseAdmin, projectId) {
  // Check if project already exists
  const { data: existingProject } = await supabaseAdmin.from('projects').select('id').eq('id', projectId).maybeSingle();
  if (existingProject) {
    throw new ValidationError('Project already exists');
  }
}
export async function createSubscription(stripe, customerId, priceId, metadata) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceId
        }
      ],
      payment_settings: {
        payment_method_types: [
          'card'
        ],
        save_default_payment_method: 'on_subscription'
      },
      metadata: {
        'billing-email': metadata.billing_email,
        'project-id': metadata.project_id,
        'owner-id': metadata.owner_id
      },
      expand: [
        'latest_invoice.payment_intent'
      ]
    });
    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice.payment_intent;
    console.log(`✅ Subscription created: ${subscription.id}`);
    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret || null,
      status: subscription.status
    };
  } catch (error) {
    throw new StripeError(`Failed to create subscription: ${error.message}`);
  }
}
