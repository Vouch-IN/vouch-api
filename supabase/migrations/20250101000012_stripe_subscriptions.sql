-- ============================================================================
-- STRIPE SUBSCRIPTIONS TABLE
-- Stripe subscriptions linked to projects
-- ============================================================================

-- Table definition
CREATE TABLE public.stripe_subscriptions (
  id TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL REFERENCES stripe_customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  price_id TEXT NOT NULL REFERENCES stripe_prices(id) ON DELETE RESTRICT,
  entitlement_id UUID REFERENCES entitlements(id) ON DELETE SET NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE stripe_subscriptions IS 'Stripe subscriptions. ID from Stripe (sub_...). Links to entitlements.';

-- Indexes
CREATE INDEX idx_subscriptions_project ON stripe_subscriptions(project_id);
CREATE INDEX idx_subscriptions_customer ON stripe_subscriptions(stripe_customer_id);
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

CREATE POLICY "Members can view subscriptions"
  ON stripe_subscriptions FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND has_project_access(project_id));

CREATE POLICY "Service role all subscriptions"
  ON stripe_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE stripe_subscriptions TO anon, authenticated, service_role;
