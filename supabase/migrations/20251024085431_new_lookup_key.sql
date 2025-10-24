-- Add lookup_key to stripe_prices
ALTER TABLE stripe_prices
  ADD COLUMN IF NOT EXISTS lookup_key TEXT;

-- Add unique constraint for lookup_key
CREATE UNIQUE INDEX idx_stripe_prices_lookup_key
  ON stripe_prices(lookup_key)
  WHERE lookup_key IS NOT NULL AND deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN stripe_prices.lookup_key IS 'Human-readable identifier for price (e.g., pro_monthly, starter_yearly)';
