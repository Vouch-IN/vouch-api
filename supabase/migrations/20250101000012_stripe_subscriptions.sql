-- ============================================================================
-- STRIPE SUBSCRIPTIONS TABLE
-- Basic subscription info synced from Stripe for UI display
-- Subscription management happens in Stripe UI, this is read-only sync
-- ============================================================================

-- Table definition
CREATE TABLE public.stripe_subscriptions (
  id TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Product & Price info for display
  product_name TEXT,
  product_id TEXT,
  price_id TEXT REFERENCES stripe_prices(id) ON DELETE RESTRICT,

  -- Pricing details
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  interval TEXT,
  interval_count INTEGER,

  -- Subscription lifecycle
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Link to entitlement
  entitlement_id UUID REFERENCES entitlements(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE stripe_subscriptions IS 'Basic subscription data synced from Stripe for UI display. Management happens in Stripe Dashboard.';
COMMENT ON COLUMN stripe_subscriptions.product_name IS 'Product name for display in UI';
COMMENT ON COLUMN stripe_subscriptions.amount IS 'Amount in cents';
COMMENT ON COLUMN stripe_subscriptions.interval IS 'Billing interval: day, week, month, year';

-- Indexes
CREATE INDEX idx_subscriptions_project ON stripe_subscriptions(project_id);
CREATE INDEX idx_subscriptions_status ON stripe_subscriptions(status);
CREATE INDEX idx_subscriptions_deleted ON stripe_subscriptions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_subscriptions_period_end ON stripe_subscriptions(current_period_end) WHERE status = 'active';

-- Triggers
CREATE TRIGGER set_updated_at_stripe_subscriptions
  BEFORE UPDATE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view subscriptions"
  ON stripe_subscriptions FOR SELECT
  TO authenticated
  USING (
    has_project_access(project_id)
    OR is_superadmin()
  );

CREATE POLICY "Service role all subscriptions"
  ON stripe_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON TABLE stripe_subscriptions TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE stripe_subscriptions TO service_role;
