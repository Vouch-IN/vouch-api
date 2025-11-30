-- ============================================================================
-- ALTER STRIPE SUBSCRIPTIONS TABLE
-- Add coupon tracking to subscriptions
-- ============================================================================

-- Add coupon-related columns to stripe_subscriptions
ALTER TABLE public.stripe_subscriptions
  ADD COLUMN discount_coupon_id TEXT REFERENCES stripe_coupons(id) ON DELETE SET NULL,
  ADD COLUMN discount_start TIMESTAMPTZ,
  ADD COLUMN discount_end TIMESTAMPTZ;

COMMENT ON COLUMN stripe_subscriptions.discount_coupon_id IS 'The coupon currently applied to this subscription (if any)';
COMMENT ON COLUMN stripe_subscriptions.discount_start IS 'When the discount was applied';
COMMENT ON COLUMN stripe_subscriptions.discount_end IS 'When the discount will end (for repeating/once coupons)';

-- Create index for querying subscriptions with active discounts
CREATE INDEX idx_subscriptions_discount ON stripe_subscriptions(discount_coupon_id)
  WHERE discount_coupon_id IS NOT NULL AND deleted_at IS NULL;
