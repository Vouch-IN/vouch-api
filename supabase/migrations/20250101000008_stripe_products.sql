-- ============================================================================
-- STRIPE PRODUCTS TABLE
-- Stripe products synced from Stripe API
-- ============================================================================

-- Table definition
CREATE TABLE public.stripe_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  entitlements JSONB DEFAULT '{}'::jsonb,
  marketing_features TEXT[] DEFAULT '{}',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE stripe_products IS 'Synced Stripe products. Soft deleted to preserve historical references.';
COMMENT ON COLUMN stripe_products.entitlements IS 'Product entitlements: { validations_limit, log_retention_days, features[] }';
COMMENT ON COLUMN stripe_products.marketing_features IS 'Marketing feature bullets displayed on pricing page';

-- Indexes
CREATE INDEX idx_stripe_products_active ON stripe_products(id) WHERE active = true AND deleted_at IS NULL;
CREATE INDEX idx_stripe_products_marketing ON stripe_products(id) WHERE active = true AND deleted_at IS NULL AND array_length(marketing_features, 1) > 0;

-- Triggers
CREATE TRIGGER set_updated_at_stripe_products
  BEFORE UPDATE ON stripe_products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON stripe_products FOR SELECT
  TO authenticated, anon
  USING (active = true AND deleted_at IS NULL);

CREATE POLICY "Service role full access to products"
  ON stripe_products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON TABLE stripe_products TO anon, authenticated;
GRANT ALL ON TABLE stripe_products TO service_role;
