-- ============================================================================
-- STRIPE PRODUCTS & PRICES TABLES
-- ============================================================================

-- Stripe Products (with soft delete)
CREATE TABLE stripe_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_stripe_products_active ON stripe_products(id) WHERE active = true AND deleted_at IS NULL;

-- Auto-update trigger
CREATE TRIGGER set_updated_at_stripe_products
  BEFORE UPDATE ON stripe_products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Stripe Prices (with soft delete)
CREATE TABLE stripe_prices (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES stripe_products(id) ON DELETE RESTRICT,
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

-- Indexes
CREATE INDEX idx_stripe_prices_product ON stripe_prices(product_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stripe_prices_active ON stripe_prices(product_id, id) WHERE active = true AND deleted_at IS NULL;

-- Auto-update trigger
CREATE TRIGGER set_updated_at_stripe_prices
  BEFORE UPDATE ON stripe_prices
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Comments
COMMENT ON TABLE stripe_products IS 'Synced Stripe products. Soft deleted to preserve historical references.';
COMMENT ON TABLE stripe_prices IS 'Synced Stripe prices. Soft deleted to preserve historical references.';

-- Grants
GRANT SELECT ON stripe_products TO authenticated, service_role;
GRANT SELECT ON stripe_prices TO authenticated, service_role;

-- ============================================================================
-- ADD FOREIGN KEYS TO EXISTING TABLES
-- ============================================================================

-- Subscriptions -> Prices (enforce referential integrity)
ALTER TABLE stripe_subscriptions
  ADD CONSTRAINT fk_stripe_subscriptions_price
  FOREIGN KEY (price_id)
  REFERENCES stripe_prices(id)
  ON DELETE RESTRICT;

-- Add index for reverse lookups
CREATE INDEX idx_stripe_subscriptions_price
  ON stripe_subscriptions(price_id);

-- Transactions (no FK needed, but add index for joins)
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_org
  ON stripe_transactions(organization_id);

-- Payment Methods -> Customers (already has FK, add index)
CREATE INDEX IF NOT EXISTS idx_stripe_payment_methods_customer
  ON stripe_payment_methods(stripe_customer_id);

-- Customers -> Organizations (add index)
CREATE INDEX IF NOT EXISTS idx_stripe_customers_org
  ON stripe_customers(organization_id);

-- Add entitlements column to stripe_products
ALTER TABLE stripe_products
  ADD COLUMN IF NOT EXISTS entitlements JSONB DEFAULT '{}'::jsonb;

-- Update comment
COMMENT ON COLUMN stripe_products.entitlements IS 'Product entitlements: { validations_limit, log_retention_days, features[] }';
