-- Drop policies that depend on organization_id
DROP POLICY IF EXISTS "Admins can view stripe customer" ON stripe_customers;
DROP POLICY IF EXISTS "Admins can view payment methods" ON stripe_payment_methods;
DROP POLICY IF EXISTS "Superadmins full access to stripe customers" ON stripe_customers;
DROP POLICY IF EXISTS "Service role can manage customers" ON stripe_customers;
DROP POLICY IF EXISTS "Users can view their own customer" ON stripe_customers;
DROP POLICY IF EXISTS "Users can view their payment methods" ON stripe_payment_methods;
DROP POLICY IF EXISTS "Superadmins full access to payment methods" ON stripe_payment_methods;
DROP POLICY IF EXISTS "Service role can manage payment methods" ON stripe_payment_methods;

-- Now drop the column
ALTER TABLE stripe_customers
  DROP COLUMN IF EXISTS organization_id;

-- Add user_id instead
ALTER TABLE stripe_customers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Unique constraint on user
CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_customers_user
  ON stripe_customers(user_id);

-- Recreate policies with user_id
CREATE POLICY "Superadmins full access to stripe customers"
  ON stripe_customers FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Users can view their own customer"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage customers"
  ON stripe_customers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Payment methods policies
CREATE POLICY "Superadmins full access to payment methods"
  ON stripe_payment_methods FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Users can view their payment methods"
  ON stripe_payment_methods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stripe_customers sc
      WHERE sc.id = stripe_payment_methods.stripe_customer_id
      AND sc.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage payment methods"
  ON stripe_payment_methods FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
