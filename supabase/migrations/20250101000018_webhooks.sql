-- ============================================================================
-- WEBHOOK TRIGGERS
-- Sync changes to Cloudflare Worker via Supabase Edge Functions
-- ============================================================================

-- Sync API Keys to Worker
CREATE TRIGGER "Sync API Keys to Worker"
  AFTER INSERT OR DELETE OR UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://api.vouch.expert/webhook',
    'POST',
    '{"Content-Type":"application/json","x-webhook-token":""}',
    '{}',
    '5000'
  );

-- Sync Projects to Worker
CREATE TRIGGER "Sync Projects to Worker"
  AFTER INSERT OR DELETE OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://api.vouch.expert/webhook',
    'POST',
    '{"Content-Type":"application/json","x-webhook-token":""}',
    '{}',
    '5000'
  );

-- Sync Subscriptions to Worker
CREATE TRIGGER "Sync Subscriptions to Worker"
  AFTER INSERT OR DELETE OR UPDATE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://api.vouch.expert/webhook',
    'POST',
    '{"Content-Type":"application/json","x-webhook-token":""}',
    '{}',
    '5000'
  );

COMMENT ON TRIGGER "Sync API Keys to Worker" ON api_keys IS 'Webhook to sync API key changes to Cloudflare Worker';
COMMENT ON TRIGGER "Sync Projects to Worker" ON projects IS 'Webhook to sync project changes to Cloudflare Worker';
COMMENT ON TRIGGER "Sync Subscriptions to Worker" ON stripe_subscriptions IS 'Webhook to sync subscription changes to Cloudflare Worker';
