-- Drop existing index first
DROP INDEX IF EXISTS idx_stripe_prices_lookup_key;

-- Add lookup_key to stripe_prices (non-null)
ALTER TABLE stripe_prices
  ADD COLUMN IF NOT EXISTS lookup_key TEXT NOT NULL DEFAULT '';

-- Update existing rows to have lookup_key = id if empty
UPDATE stripe_prices
SET lookup_key = id
WHERE lookup_key = '' OR lookup_key IS NULL;

-- Remove default after backfill
ALTER TABLE stripe_prices
  ALTER COLUMN lookup_key DROP DEFAULT;

-- Add unique constraint
CREATE UNIQUE INDEX idx_stripe_prices_lookup_key
  ON stripe_prices(lookup_key)
  WHERE deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN stripe_prices.lookup_key IS 'Human-readable identifier for price (e.g., pro_monthly, starter_yearly) - REQUIRED';
