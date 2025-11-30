-- ============================================================================
-- STRIPE COUPON PRODUCTS JUNCTION TABLE
-- Many-to-many relationship between coupons and products
-- ============================================================================

-- Create junction table for coupon-product relationships
CREATE TABLE public.stripe_coupon_products (
  coupon_id TEXT NOT NULL REFERENCES stripe_coupons(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES stripe_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (coupon_id, product_id)
);

COMMENT ON TABLE stripe_coupon_products IS 'Junction table for many-to-many relationship between coupons and products. If a coupon has no entries here, it applies to all products.';
COMMENT ON COLUMN stripe_coupon_products.coupon_id IS 'The Stripe coupon ID';
COMMENT ON COLUMN stripe_coupon_products.product_id IS 'The Stripe product ID this coupon applies to';

-- Indexes for efficient lookups in both directions
CREATE INDEX idx_stripe_coupon_products_coupon ON stripe_coupon_products(coupon_id);
CREATE INDEX idx_stripe_coupon_products_product ON stripe_coupon_products(product_id);

-- RLS
ALTER TABLE stripe_coupon_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view coupon-product relationships"
  ON stripe_coupon_products FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role full access to coupon-product relationships"
  ON stripe_coupon_products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON TABLE stripe_coupon_products TO anon, authenticated;
GRANT ALL ON TABLE stripe_coupon_products TO service_role;

-- ============================================================================
-- HELPER FUNCTION: Sync applies_to_product_ids array to junction table
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_coupon_products_from_array()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing relationships for this coupon
  DELETE FROM stripe_coupon_products WHERE coupon_id = NEW.id;

  -- Only insert if applies_to_product_ids is not empty
  IF NEW.applies_to_product_ids IS NOT NULL AND array_length(NEW.applies_to_product_ids, 1) > 0 THEN
    -- Insert new relationships
    INSERT INTO stripe_coupon_products (coupon_id, product_id)
    SELECT NEW.id, unnest(NEW.applies_to_product_ids);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_coupon_products_from_array IS 'Automatically syncs applies_to_product_ids array to stripe_coupon_products junction table';

-- Create trigger to auto-sync array to junction table
CREATE TRIGGER sync_coupon_products_trigger
  AFTER INSERT OR UPDATE OF applies_to_product_ids ON stripe_coupons
  FOR EACH ROW
  EXECUTE FUNCTION sync_coupon_products_from_array();

-- ============================================================================
-- BACKFILL: Sync existing coupons to junction table
-- ============================================================================

-- Sync any existing coupons
INSERT INTO stripe_coupon_products (coupon_id, product_id)
SELECT c.id, unnest(c.applies_to_product_ids)
FROM stripe_coupons c
WHERE c.applies_to_product_ids IS NOT NULL
  AND array_length(c.applies_to_product_ids, 1) > 0
ON CONFLICT (coupon_id, product_id) DO NOTHING;
