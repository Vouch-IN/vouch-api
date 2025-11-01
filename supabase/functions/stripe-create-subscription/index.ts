import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@19.1.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleError, AuthenticationError } from './errors.ts';
import { validateRequest } from './validations.ts';
import { getOrCreateCustomer, attachPaymentMethod } from './customer.ts';
import { validateProject, createSubscription } from './subscription.ts';
import { createProject } from './project.ts';
const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'), {
  apiVersion: '2025-09-30.clover'
});
const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new AuthenticationError('Missing authorization header');
    }
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new AuthenticationError('Unauthorized');
    }
    // Parse and validate request
    const body = await req.json();
    const request = validateRequest(body);
    // Verify user is the owner
    if (request.owner_id !== user.id) {
      throw new AuthenticationError('User ID mismatch');
    }
    console.log(`🚀 Creating subscription for project: ${request.project_id}`);
    // Validate project doesn't exist
    await validateProject(supabaseAdmin, request.project_id);
    // Get or create Stripe customer
    const { customer_id } = await getOrCreateCustomer(stripe, supabaseAdmin, request.owner_id, request.billing_email);
    // Only attach payment method for paid plans
    if (request.payment_method_id) {
      await attachPaymentMethod(stripe, customer_id, request.payment_method_id, request.project_id);
    }
    // Create project
    const project = await createProject(supabaseAdmin, request.project_id, request.project_slug, request.project_name, request.owner_id, request.billing_email);
    // Create subscription
    const { subscriptionId, clientSecret, status } = await createSubscription(stripe, customer_id, request.price_id, {
      project_id: request.project_id,
      owner_id: request.owner_id,
      billing_email: request.billing_email
    });
    const response = {
      subscription_id: subscriptionId,
      client_secret: clientSecret,
      status,
      project
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    return handleError(error);
  }
});
