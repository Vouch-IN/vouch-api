-- ============================================================================
-- STRIPE PRICES TABLE
-- Stripe prices synced from Stripe API
-- ============================================================================

-- Table definition
CREATE TABLE public.stripe_prices (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES stripe_products(id) ON DELETE RESTRICT,
  lookup_key TEXT NOT NULL,
  nickname TEXT,
  currency TEXT NOT NULL,
  unit_amount INTEGER,
  recurring_interval TEXT,
  recurring_interval_count INTEGER,
  type TEXT NOT NULL CHECK (type IN ('one_time', 'recurring')),
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE stripe_prices IS 'Synced Stripe prices. Soft deleted to preserve historical references.';
COMMENT ON COLUMN stripe_prices.lookup_key IS 'Human-readable identifier for price (e.g., pro_monthly, starter_yearly) - REQUIRED';

-- Indexes
CREATE INDEX idx_stripe_prices_product ON stripe_prices(product_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stripe_prices_active ON stripe_prices(product_id, id) WHERE active = true AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_stripe_prices_lookup_key ON stripe_prices(lookup_key) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER set_updated_at_stripe_prices
  BEFORE UPDATE ON stripe_prices
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active prices"
  ON stripe_prices FOR SELECT
  TO authenticated, anon
  USING (active = true AND deleted_at IS NULL);

CREATE POLICY "Service role full access to prices"
  ON stripe_prices FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON TABLE stripe_prices TO anon, authenticated;
GRANT ALL ON TABLE stripe_prices TO service_role;
