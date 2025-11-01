-- ============================================================================
-- STRIPE CUSTOMERS TABLE
-- One stripe customer per user
-- ============================================================================

-- Table definition
CREATE TABLE public.stripe_customers (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE stripe_customers IS 'Stripe customer records. ID from Stripe (cus_...). One per user.';

-- Indexes
CREATE UNIQUE INDEX idx_stripe_customers_user ON stripe_customers(user_id);

-- Triggers
CREATE TRIGGER set_updated_at_stripe_customers
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customer"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Superadmins can view all customers"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Superadmins can manage all customers"
  ON stripe_customers FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Service role full access to customers"
  ON stripe_customers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON TABLE stripe_customers TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE stripe_customers TO service_role;
