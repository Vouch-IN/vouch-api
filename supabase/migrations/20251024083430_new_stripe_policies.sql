-- ============================================================================
-- RLS FOR STRIPE PRODUCTS & PRICES
-- ============================================================================

-- Enable RLS
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;

-- Everyone can read (including unauthenticated)
CREATE POLICY "Anyone can view products"
  ON stripe_products FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Anyone can view prices"
  ON stripe_prices FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

-- Only service role can modify (webhooks)
CREATE POLICY "Service role can manage products"
  ON stripe_products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage prices"
  ON stripe_prices FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
