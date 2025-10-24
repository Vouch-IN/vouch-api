-- Add marketing columns to stripe_products
ALTER TABLE stripe_products
  ADD COLUMN IF NOT EXISTS marketing_features TEXT[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN stripe_products.marketing_features IS 'Marketing feature bullets displayed on pricing page';

-- Add index for active products with marketing features
CREATE INDEX IF NOT EXISTS idx_stripe_products_marketing
  ON stripe_products(id)
  WHERE active = true AND deleted_at IS NULL AND array_length(marketing_features, 1) > 0;
