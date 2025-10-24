-- ============================================================================
-- COMPLETE RLS AUDIT - EXCLUDE SOFT DELETED RECORDS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Superadmins can view all users" ON users;
DROP POLICY IF EXISTS "Superadmins can update any user" ON users;
DROP POLICY IF EXISTS "Org members can view other members" ON users;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (
    id = auth.uid()
    AND is_superadmin = (SELECT is_superadmin FROM users WHERE id = auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "Superadmins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (is_superadmin() AND deleted_at IS NULL);

CREATE POLICY "Superadmins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Org members can view other members"
  ON users FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM organization_members om1
      WHERE om1.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM organization_members om2
        WHERE om2.user_id = users.id
        AND om2.organization_id = om1.organization_id
      )
    )
  );

-- ----------------------------------------------------------------------------
-- ORGANIZATIONS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Superadmins full access to organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;

CREATE POLICY "Superadmins full access to organizations"
  ON organizations FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (is_org_member(id) OR owner_id = auth.uid())
  );

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (owner_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Owners can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() AND deleted_at IS NULL);

-- ----------------------------------------------------------------------------
-- ORGANIZATION_MEMBERS (no soft delete, but check org not deleted)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Superadmins full access to org members" ON organization_members;
DROP POLICY IF EXISTS "Members can view org members" ON organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON organization_members;
DROP POLICY IF EXISTS "Admins can remove members" ON organization_members;
DROP POLICY IF EXISTS "Members can leave organization" ON organization_members;

CREATE POLICY "Superadmins full access to org members"
  ON organization_members FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_members.organization_id
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can add members"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    (is_org_admin(organization_id) OR is_org_owner(organization_id))
    AND user_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_members.organization_id
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can update member roles"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    (is_org_admin(organization_id) OR is_org_owner(organization_id))
    AND user_id != auth.uid()
    AND NOT is_org_owner(organization_id)
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_members.organization_id
      AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    (is_org_admin(organization_id) OR is_org_owner(organization_id))
    AND user_id != auth.uid()
    AND NOT is_org_owner(organization_id)
  );

CREATE POLICY "Admins can remove members"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    (is_org_admin(organization_id) OR is_org_owner(organization_id))
    AND user_id != auth.uid()
    AND NOT is_org_owner(organization_id)
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_members.organization_id
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Members can leave organization"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT is_org_owner(organization_id)
  );

-- ----------------------------------------------------------------------------
-- PROJECTS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Superadmins full access to projects" ON projects;
DROP POLICY IF EXISTS "Org members can view projects" ON projects;
DROP POLICY IF EXISTS "Admins can create projects" ON projects;
DROP POLICY IF EXISTS "Admins can update projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;

CREATE POLICY "Superadmins full access to projects"
  ON projects FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Org members can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = projects.organization_id
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    (is_org_admin(organization_id) OR is_org_owner(organization_id))
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = projects.organization_id
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (is_org_admin(organization_id) OR is_org_owner(organization_id))
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (is_org_admin(organization_id) OR is_org_owner(organization_id))
  );

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (is_org_admin(organization_id) OR is_org_owner(organization_id))
  );

-- ----------------------------------------------------------------------------
-- API_KEYS (no soft delete, but check project not deleted)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Superadmins full access to api keys" ON api_keys;
DROP POLICY IF EXISTS "Org members can view api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can create api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can update api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can delete api keys" ON api_keys;

CREATE POLICY "Superadmins full access to api keys"
  ON api_keys FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Org members can view api keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (
    revoked_at IS NULL
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = api_keys.project_id
      AND projects.deleted_at IS NULL
      AND is_org_member(projects.organization_id)
    )
  );

CREATE POLICY "Admins can create api keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = api_keys.project_id
      AND projects.deleted_at IS NULL
      AND (is_org_admin(projects.organization_id) OR is_org_owner(projects.organization_id))
    )
  );

CREATE POLICY "Admins can update api keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = api_keys.project_id
      AND projects.deleted_at IS NULL
      AND (is_org_admin(projects.organization_id) OR is_org_owner(projects.organization_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = api_keys.project_id
      AND projects.deleted_at IS NULL
      AND (is_org_admin(projects.organization_id) OR is_org_owner(projects.organization_id))
    )
  );

CREATE POLICY "Admins can delete api keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = api_keys.project_id
      AND projects.deleted_at IS NULL
      AND (is_org_admin(projects.organization_id) OR is_org_owner(projects.organization_id))
    )
  );

-- ----------------------------------------------------------------------------
-- STRIPE TABLES (no deleted_at checks needed - soft delete handled in SELECT policies)
-- ----------------------------------------------------------------------------

-- STRIPE_CUSTOMERS
DROP POLICY IF EXISTS "Superadmins can view all" ON stripe_customers;
DROP POLICY IF EXISTS "Admins can view stripe customer" ON stripe_customers;
DROP POLICY IF EXISTS "Service role can manage customers" ON stripe_customers;
DROP POLICY IF EXISTS "Superadmins full access to stripe customers" ON stripe_customers;

CREATE POLICY "Superadmins full access to stripe customers"
  ON stripe_customers FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Admins can view stripe customer"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (
    (is_org_admin(organization_id) OR is_org_owner(organization_id))
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = stripe_customers.organization_id
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Service role can manage customers"
  ON stripe_customers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- STRIPE_PAYMENT_METHODS
DROP POLICY IF EXISTS "Superadmins full access to payment methods" ON stripe_payment_methods;
DROP POLICY IF EXISTS "Admins can view payment methods" ON stripe_payment_methods;
DROP POLICY IF EXISTS "Service role can manage payment methods" ON stripe_payment_methods;

CREATE POLICY "Superadmins full access to payment methods"
  ON stripe_payment_methods FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Admins can view payment methods"
  ON stripe_payment_methods FOR SELECT
  TO authenticated
  USING (
    detached_at IS NULL
    AND EXISTS (
      SELECT 1 FROM stripe_customers sc
      INNER JOIN organizations o ON o.id = sc.organization_id
      WHERE sc.id = stripe_payment_methods.stripe_customer_id
      AND o.deleted_at IS NULL
      AND (is_org_admin(sc.organization_id) OR is_org_owner(sc.organization_id))
    )
  );

CREATE POLICY "Service role can manage payment methods"
  ON stripe_payment_methods FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- STRIPE_SUBSCRIPTIONS
DROP POLICY IF EXISTS "Superadmins full access to subscriptions" ON stripe_subscriptions;
DROP POLICY IF EXISTS "Admins can view subscriptions" ON stripe_subscriptions;
DROP POLICY IF EXISTS "Members can view subscriptions" ON stripe_subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON stripe_subscriptions;

CREATE POLICY "Superadmins full access to subscriptions"
  ON stripe_subscriptions FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Admins can view subscriptions"
  ON stripe_subscriptions FOR SELECT
  TO authenticated
  USING (
    (is_org_admin(organization_id) OR is_org_owner(organization_id))
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = stripe_subscriptions.organization_id
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Members can view subscriptions"
  ON stripe_subscriptions FOR SELECT
  TO authenticated
  USING (
    is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = stripe_subscriptions.organization_id
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Service role can manage subscriptions"
  ON stripe_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- STRIPE_TRANSACTIONS
DROP POLICY IF EXISTS "Superadmins full access to transactions" ON stripe_transactions;
DROP POLICY IF EXISTS "Admins can view transactions" ON stripe_transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON stripe_transactions;

CREATE POLICY "Superadmins full access to transactions"
  ON stripe_transactions FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Admins can view transactions"
  ON stripe_transactions FOR SELECT
  TO authenticated
  USING (
    (is_org_admin(organization_id) OR is_org_owner(organization_id))
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = stripe_transactions.organization_id
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Service role can manage transactions"
  ON stripe_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- STRIPE_PRODUCTS
DROP POLICY IF EXISTS "Anyone can view products" ON stripe_products;
DROP POLICY IF EXISTS "Service role can manage products" ON stripe_products;

CREATE POLICY "Anyone can view products"
  ON stripe_products FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Service role can manage products"
  ON stripe_products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- STRIPE_PRICES
DROP POLICY IF EXISTS "Anyone can view prices" ON stripe_prices;
DROP POLICY IF EXISTS "Service role can manage prices" ON stripe_prices;

CREATE POLICY "Anyone can view prices"
  ON stripe_prices FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL AND active = true);

CREATE POLICY "Service role can manage prices"
  ON stripe_prices FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update products policy to include active check
DROP POLICY "Anyone can view products" ON stripe_products;

CREATE POLICY "Anyone can view products"
  ON stripe_products FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL AND active = true);

-- ENTITLEMENTS
DROP POLICY IF EXISTS "Superadmins full access to entitlements" ON entitlements;
DROP POLICY IF EXISTS "Admins can view entitlements" ON entitlements;
DROP POLICY IF EXISTS "Members can view entitlements" ON entitlements;
DROP POLICY IF EXISTS "Service role can manage entitlements" ON entitlements;

CREATE POLICY "Superadmins full access to entitlements"
  ON entitlements FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Admins can view entitlements"
  ON entitlements FOR SELECT
  TO authenticated
  USING (
    (is_org_admin(organization_id) OR is_org_owner(organization_id))
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = entitlements.organization_id
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Members can view entitlements"
  ON entitlements FOR SELECT
  TO authenticated
  USING (
    is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = entitlements.organization_id
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Service role can manage entitlements"
  ON entitlements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- USAGE (no soft delete, but check project not deleted)
DROP POLICY IF EXISTS "Superadmins full access to usage" ON usage;
DROP POLICY IF EXISTS "Org members can view usage" ON usage;
DROP POLICY IF EXISTS "Service role can manage usage" ON usage;

CREATE POLICY "Superadmins full access to usage"
  ON usage FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Org members can view usage"
  ON usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = usage.project_id
      AND projects.deleted_at IS NULL
      AND is_org_member(projects.organization_id)
    )
  );

CREATE POLICY "Service role can manage usage"
  ON usage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- VALIDATION_LOGS (no soft delete, but check project not deleted)
DROP POLICY IF EXISTS "Superadmins full access to validation logs" ON validation_logs;
DROP POLICY IF EXISTS "Org members can view validation logs" ON validation_logs;
DROP POLICY IF EXISTS "Service role can manage validation logs" ON validation_logs;

CREATE POLICY "Superadmins full access to validation logs"
  ON validation_logs FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Org members can view validation logs"
  ON validation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = validation_logs.project_id
      AND projects.deleted_at IS NULL
      AND is_org_member(projects.organization_id)
    )
  );

CREATE POLICY "Service role can manage validation logs"
  ON validation_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
