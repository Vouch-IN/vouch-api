-- ============================================================================
-- STRIPE PAYMENT METHODS TABLE
-- Payment methods for stripe customers
-- ============================================================================

-- Table definition
CREATE TABLE public.stripe_payment_methods (
  id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL REFERENCES stripe_customers(id) ON DELETE CASCADE,
  type TEXT,
  billing_details JSONB,
  card_brand TEXT,
  card_last4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  detached_at TIMESTAMPTZ
);

COMMENT ON TABLE stripe_payment_methods IS 'Payment methods. ID from Stripe (pm_...). Viewable by project owners only.';

-- Indexes
CREATE INDEX idx_payment_methods_customer ON stripe_payment_methods(stripe_customer_id) WHERE detached_at IS NULL;
CREATE INDEX idx_payment_methods_default ON stripe_payment_methods(stripe_customer_id, is_default) WHERE is_default = TRUE AND detached_at IS NULL;

-- Triggers
CREATE TRIGGER set_updated_at_stripe_payment_methods
  BEFORE UPDATE ON stripe_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE stripe_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view payment methods"
  ON stripe_payment_methods FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM stripe_customers
    WHERE stripe_customers.id = stripe_payment_methods.stripe_customer_id
    AND stripe_customers.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access to payment methods"
  ON stripe_payment_methods FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE stripe_payment_methods TO anon, authenticated, service_role;
