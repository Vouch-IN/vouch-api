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

-- Foreign key for projects
ALTER TABLE projects
  ADD CONSTRAINT projects_stripe_customer_id_fkey
  FOREIGN KEY (stripe_customer_id)
  REFERENCES stripe_customers(id);

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

CREATE POLICY "Service role full access to customers"
  ON stripe_customers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE stripe_customers TO anon, authenticated, service_role;
