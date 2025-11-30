-- ============================================================================
-- STRIPE COUPONS TABLE
-- Stripe coupons synced from Stripe API
-- ============================================================================

-- Table definition
CREATE TABLE public.stripe_coupons (
  id TEXT PRIMARY KEY,
  name TEXT,
  amount_off INTEGER,
  percent_off NUMERIC(5,2),
  currency TEXT,
  duration TEXT NOT NULL CHECK (duration IN ('once', 'repeating', 'forever')),
  duration_in_months INTEGER,
  max_redemptions INTEGER,
  times_redeemed INTEGER DEFAULT 0,
  valid BOOLEAN NOT NULL DEFAULT true,
  redeem_by TIMESTAMPTZ,
  applies_to_product_ids TEXT[] DEFAULT '{}',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE stripe_coupons IS 'Synced Stripe coupons. Soft deleted to preserve historical references.';
COMMENT ON COLUMN stripe_coupons.amount_off IS 'Fixed amount discount in cents (e.g., 7000 for $70.00)';
COMMENT ON COLUMN stripe_coupons.percent_off IS 'Percentage discount (e.g., 25.00 for 25%)';
COMMENT ON COLUMN stripe_coupons.duration IS 'How long the coupon applies: once, repeating, or forever';
COMMENT ON COLUMN stripe_coupons.duration_in_months IS 'Number of months if duration is repeating (e.g., 12 for 12 months)';
COMMENT ON COLUMN stripe_coupons.applies_to_product_ids IS 'Array of product IDs this coupon can be applied to (empty = all products)';

-- Indexes
CREATE INDEX idx_stripe_coupons_valid ON stripe_coupons(id) WHERE valid = true AND deleted_at IS NULL;
CREATE INDEX idx_stripe_coupons_product ON stripe_coupons USING GIN(applies_to_product_ids) WHERE valid = true AND deleted_at IS NULL;
CREATE INDEX idx_stripe_coupons_redeem_by ON stripe_coupons(redeem_by) WHERE redeem_by IS NOT NULL AND deleted_at IS NULL;

-- Triggers
CREATE TRIGGER set_updated_at_stripe_coupons
  BEFORE UPDATE ON stripe_coupons
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE stripe_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view valid coupons"
  ON stripe_coupons FOR SELECT
  TO authenticated, anon
  USING (valid = true AND deleted_at IS NULL);

CREATE POLICY "Service role full access to coupons"
  ON stripe_coupons FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON TABLE stripe_coupons TO anon, authenticated;
GRANT ALL ON TABLE stripe_coupons TO service_role;
