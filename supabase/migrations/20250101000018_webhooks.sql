-- ============================================================================
-- WEBHOOK CONFIGURATION WITH VAULT
-- Store secrets for different environments
-- ============================================================================

-- Add these secrets via Supabase Dashboard > Project Settings > Vault:
-- 1. WEBHOOK_URL (e.g., 'https://api.vouch.expert/webhook' for prod)
-- 2. WEBHOOK_TOKEN (your secret token)

-- ============================================================================
-- CUSTOM WEBHOOK FUNCTION
-- Fetches URL and token from Vault, then makes HTTP request
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_to_worker()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  webhook_token TEXT;
  payload JSONB;
  request_id BIGINT;
BEGIN
  -- Fetch secrets from Vault
  SELECT decrypted_secret INTO webhook_url
  FROM vault.decrypted_secrets
  WHERE name = 'WEBHOOK_URL';

  SELECT decrypted_secret INTO webhook_token
  FROM vault.decrypted_secrets
  WHERE name = 'WEBHOOK_TOKEN';

  -- Build payload with table name and row data
  payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'old_row', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD.*) ELSE NULL END,
    'new_row', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW.*) ELSE NULL END,
    'timestamp', NOW()
  );

  -- Make async HTTP request using pg_net
  SELECT net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-token', webhook_token
    ),
    body := payload,
    timeout_milliseconds := 5000
  ) INTO request_id;

  -- Log the request (optional, helpful for debugging)
  RAISE LOG 'Webhook fired for %.% (operation: %, request_id: %)',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, request_id;

  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION sync_to_worker() IS 'Generic webhook function that syncs table changes to Cloudflare Worker using Vault secrets';

-- ============================================================================
-- WEBHOOK TRIGGERS
-- Attach the custom function to each table
-- ============================================================================

-- Sync API Keys to Worker
CREATE TRIGGER "Sync API Keys to Worker"
  AFTER INSERT OR UPDATE OR DELETE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_worker();

-- Sync Projects to Worker
CREATE TRIGGER "Sync Projects to Worker"
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_worker();

-- Sync Subscriptions to Worker
CREATE TRIGGER "Sync Subscriptions to Worker"
  AFTER INSERT OR UPDATE OR DELETE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_worker();

COMMENT ON TRIGGER "Sync API Keys to Worker" ON api_keys IS 'Webhook to sync API key changes to Cloudflare Worker';
COMMENT ON TRIGGER "Sync Projects to Worker" ON projects IS 'Webhook to sync project changes to Cloudflare Worker';
COMMENT ON TRIGGER "Sync Subscriptions to Worker" ON stripe_subscriptions IS 'Webhook to sync subscription changes to Cloudflare Worker';
