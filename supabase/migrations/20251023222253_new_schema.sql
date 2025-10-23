-- ============================================================================
-- VOUCH COMPLETE SCHEMA
-- ============================================================================

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USERS (synced from auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_superadmin ON users(id) WHERE is_superadmin = TRUE AND deleted_at IS NULL;

-- Auto-update trigger
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE users IS 'Platform users synced from auth.users';
COMMENT ON COLUMN users.is_superadmin IS 'Platform superadmins (us). Cannot be self-assigned.';

-- ----------------------------------------------------------------------------
-- 2. ORGANIZATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_email TEXT,
  billing_address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_organizations_owner ON organizations(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_created ON organizations(created_at DESC) WHERE deleted_at IS NULL;

-- Auto-update trigger
CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE organizations IS 'Organizations (teams). Slug-based IDs for clean URLs.';
COMMENT ON COLUMN organizations.billing_address IS 'JSONB: { line1, line2, city, state, postal_code, country }';

-- ----------------------------------------------------------------------------
-- 3. ORGANIZATION MEMBERS
-- ----------------------------------------------------------------------------
CREATE TABLE public.organization_members (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

-- Indexes
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org_role ON organization_members(organization_id, role);

-- Auto-update trigger
CREATE TRIGGER set_updated_at_organization_members
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE organization_members IS 'Many-to-many: users <-> organizations with roles';

-- ----------------------------------------------------------------------------
-- 4. PROJECTS
-- ----------------------------------------------------------------------------
CREATE TABLE public.projects (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id)
);

-- Indexes
CREATE INDEX idx_projects_org ON projects(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_created ON projects(created_at DESC) WHERE deleted_at IS NULL;

-- Auto-update trigger
CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE projects IS 'Projects within organizations. Slug-based IDs.';
COMMENT ON COLUMN projects.settings IS 'JSONB: { blacklist, whitelist, allowedDomains, riskWeights, thresholds, validations }';

-- ----------------------------------------------------------------------------
-- 5. API KEYS
-- ----------------------------------------------------------------------------
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('client', 'server')),
  environment TEXT NOT NULL CHECK (environment IN ('test', 'live')),
  name TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_api_keys_project ON api_keys(project_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_active ON api_keys(project_id, environment, type) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_last_used ON api_keys(last_used_at DESC) WHERE revoked_at IS NULL;

COMMENT ON TABLE api_keys IS 'Project API keys for client and server use';

-- ----------------------------------------------------------------------------
-- 6. STRIPE CUSTOMERS
-- ----------------------------------------------------------------------------
CREATE TABLE public.stripe_customers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);

-- Indexes
CREATE UNIQUE INDEX idx_stripe_customers_org ON stripe_customers(organization_id);

-- Auto-update trigger
CREATE TRIGGER set_updated_at_stripe_customers
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE stripe_customers IS 'Stripe customer records. ID from Stripe (cus_...). One per org.';

-- ----------------------------------------------------------------------------
-- 7. STRIPE PAYMENT METHODS
-- ----------------------------------------------------------------------------
CREATE TABLE public.stripe_payment_methods (
  id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL REFERENCES stripe_customers(id) ON DELETE CASCADE,
  type TEXT,
  billing_details JSONB,
  card_brand TEXT,
  card_last4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  detached_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_payment_methods_customer ON stripe_payment_methods(stripe_customer_id) WHERE detached_at IS NULL;
CREATE INDEX idx_payment_methods_default ON stripe_payment_methods(stripe_customer_id, is_default) WHERE is_default = TRUE AND detached_at IS NULL;

-- Auto-update trigger
CREATE TRIGGER set_updated_at_stripe_payment_methods
  BEFORE UPDATE ON stripe_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE stripe_payment_methods IS 'Payment methods. ID from Stripe (pm_...). Viewable by org admins only.';

-- ----------------------------------------------------------------------------
-- 8. ENTITLEMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('stripe', 'manual', 'promo')),
  validations_limit INTEGER NOT NULL,
  log_retention_days INTEGER NOT NULL,
  features TEXT[] NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_entitlements_org ON entitlements(organization_id);
CREATE INDEX idx_entitlements_active_null ON entitlements(organization_id, ends_at) WHERE ends_at IS NULL;
CREATE INDEX idx_entitlements_with_expiry ON entitlements(organization_id, ends_at) WHERE ends_at IS NOT NULL;
CREATE INDEX idx_entitlements_source ON entitlements(source);


-- Auto-update trigger
CREATE TRIGGER set_updated_at_entitlements
  BEFORE UPDATE ON entitlements
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE entitlements IS 'Organization entitlements. Can exist independently of Stripe subscriptions.';
COMMENT ON COLUMN entitlements.features IS 'Array: [''pro_dashboard'', ''custom_risk_weights'', ''advanced_analytics'', ''priority_support'']';

-- ----------------------------------------------------------------------------
-- 9. STRIPE SUBSCRIPTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE public.stripe_subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL REFERENCES stripe_customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  price_id TEXT NOT NULL,
  entitlement_id UUID REFERENCES entitlements(id) ON DELETE SET NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_subscriptions_org ON stripe_subscriptions(organization_id);
CREATE INDEX idx_subscriptions_customer ON stripe_subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON stripe_subscriptions(status);
CREATE INDEX idx_subscriptions_active ON stripe_subscriptions(organization_id, status) WHERE status = 'active';
CREATE INDEX idx_subscriptions_period_end ON stripe_subscriptions(current_period_end) WHERE status = 'active';

-- Auto-update trigger
CREATE TRIGGER set_updated_at_stripe_subscriptions
  BEFORE UPDATE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE stripe_subscriptions IS 'Stripe subscriptions. ID from Stripe (sub_...). Links to entitlements.';

-- ----------------------------------------------------------------------------
-- 10. STRIPE TRANSACTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE public.stripe_transactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('charge', 'refund', 'payout', 'adjustment')),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  processed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_transactions_org ON stripe_transactions(organization_id);
CREATE INDEX idx_transactions_processed ON stripe_transactions(processed_at DESC);
CREATE INDEX idx_transactions_org_processed ON stripe_transactions(organization_id, processed_at DESC);
CREATE INDEX idx_transactions_type ON stripe_transactions(type);
CREATE INDEX idx_transactions_status ON stripe_transactions(status);

COMMENT ON TABLE stripe_transactions IS 'Payment transactions. ID from Stripe (ch_..., re_...). Admin-visible only.';

-- ----------------------------------------------------------------------------
-- 11. USAGE
-- ----------------------------------------------------------------------------
CREATE TABLE public.usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  count INTEGER NOT NULL DEFAULT 0,
  limit_exceeded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, month)
);

-- Indexes
CREATE UNIQUE INDEX idx_usage_project_month ON usage(project_id, month);
CREATE INDEX idx_usage_month ON usage(month);
CREATE INDEX idx_usage_exceeded ON usage(project_id) WHERE limit_exceeded_at IS NOT NULL;

-- Auto-update trigger
CREATE TRIGGER set_updated_at_usage
  BEFORE UPDATE ON usage
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE usage IS 'Monthly validation usage per project. Format: YYYY-MM';

-- ----------------------------------------------------------------------------
-- 12. VALIDATION LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE public.validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email_hash TEXT NOT NULL,
  email_encrypted TEXT NOT NULL,
  fingerprint_id TEXT,
  ip_address INET,
  is_valid BOOLEAN NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('allow', 'flag', 'block')),
  signals TEXT[] NOT NULL DEFAULT '{}',
  checks JSONB NOT NULL,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_validation_logs_project_created ON validation_logs(project_id, created_at DESC);
CREATE INDEX idx_validation_logs_fingerprint ON validation_logs(fingerprint_id) WHERE fingerprint_id IS NOT NULL;
CREATE INDEX idx_validation_logs_email_hash ON validation_logs(email_hash);
CREATE INDEX idx_validation_logs_recommendation ON validation_logs(recommendation);
CREATE INDEX idx_validation_logs_risk_score ON validation_logs(risk_score);
CREATE INDEX idx_validation_logs_created ON validation_logs(created_at DESC);
CREATE INDEX idx_validation_logs_ip ON validation_logs(ip_address) WHERE ip_address IS NOT NULL;

COMMENT ON TABLE validation_logs IS 'Email validation logs. Auto-deleted based on org entitlements.';

-- ============================================================================
-- AUTH SYNC
-- ============================================================================

-- Sync auth.users to public.users on signup/update
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = now()
  WHERE
    public.users.email IS DISTINCT FROM EXCLUDED.email
    OR public.users.name IS DISTINCT FROM EXCLUDED.name;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users
CREATE TRIGGER trg_sync_auth_users_to_public
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_user_to_public();

-- ============================================================================
-- RLS HELPER FUNCTIONS
-- ============================================================================

-- Check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND is_superadmin = TRUE
    AND deleted_at IS NULL
  );
$$;

-- Check if user is in organization (any role)
CREATE OR REPLACE FUNCTION public.is_org_member(org_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  );
$$;

-- Check if user is admin of organization
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Check if user is owner of organization
CREATE OR REPLACE FUNCTION public.is_org_owner(org_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = org_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  );
$$;

-- Get all organizations user has access to
CREATE OR REPLACE FUNCTION public.user_organizations()
RETURNS SETOF TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid();
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- USERS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid() OR is_superadmin());

-- Users can update their own profile (except is_superadmin)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND is_superadmin = (SELECT is_superadmin FROM users WHERE id = auth.uid())
  );

-- Superadmins can view all users
CREATE POLICY "Superadmins can view all users"
  ON users FOR SELECT
  USING (is_superadmin());

-- Superadmins can update any user
CREATE POLICY "Superadmins can update any user"
  ON users FOR UPDATE
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Org members can view other org members
CREATE POLICY "Org members can view other members"
  ON users FOR SELECT
  USING (
    EXISTS (
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
-- ORGANIZATIONS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Superadmins can do anything
CREATE POLICY "Superadmins full access to organizations"
  ON organizations FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Users can view organizations they're members of
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (is_org_member(id));

-- Users can create organizations (they become owner)
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Only owners can update organizations
CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Only owners can delete organizations (soft delete)
CREATE POLICY "Owners can delete organizations"
  ON organizations FOR DELETE
  USING (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- ORGANIZATION_MEMBERS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Superadmins can do anything
CREATE POLICY "Superadmins full access to org members"
  ON organization_members FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Members can view other members in their orgs
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  USING (is_org_member(organization_id));

-- Admins and owners can add members (but not themselves)
CREATE POLICY "Admins can add members"
  ON organization_members FOR INSERT
  WITH CHECK (
    is_org_admin(organization_id)
    AND user_id != auth.uid()
  );

-- Admins can update member roles (not their own, not owner's)
CREATE POLICY "Admins can update member roles"
  ON organization_members FOR UPDATE
  USING (
    is_org_admin(organization_id)
    AND user_id != auth.uid()
    AND NOT is_org_owner(organization_id)
  )
  WITH CHECK (
    is_org_admin(organization_id)
    AND user_id != auth.uid()
    AND NOT is_org_owner(organization_id)
  );

-- Admins can remove members (not self, not owner)
CREATE POLICY "Admins can remove members"
  ON organization_members FOR DELETE
  USING (
    is_org_admin(organization_id)
    AND user_id != auth.uid()
    AND NOT is_org_owner(organization_id)
  );

-- Members can remove themselves (leave org), except owner
CREATE POLICY "Members can leave organization"
  ON organization_members FOR DELETE
  USING (
    user_id = auth.uid()
    AND NOT is_org_owner(organization_id)
  );

-- ----------------------------------------------------------------------------
-- PROJECTS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Superadmins can do anything
CREATE POLICY "Superadmins full access to projects"
  ON projects FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Org members can view all org projects
CREATE POLICY "Org members can view projects"
  ON projects FOR SELECT
  USING (is_org_member(organization_id));

-- Org admins can create projects
CREATE POLICY "Admins can create projects"
  ON projects FOR INSERT
  WITH CHECK (is_org_admin(organization_id));

-- Org admins can update projects
CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  USING (is_org_admin(organization_id))
  WITH CHECK (is_org_admin(organization_id));

-- Org admins can delete projects
CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  USING (is_org_admin(organization_id));

-- ----------------------------------------------------------------------------
-- API_KEYS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Superadmins can do anything
CREATE POLICY "Superadmins full access to api keys"
  ON api_keys FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Org members can view API keys for their projects
CREATE POLICY "Org members can view api keys"
  ON api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = api_keys.project_id
      AND is_org_member(projects.organization_id)
    )
  );

-- Org admins can create API keys
CREATE POLICY "Admins can create api keys"
  ON api_keys FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = api_keys.project_id
      AND is_org_admin(projects.organization_id)
    )
  );

-- Org admins can update API keys (revoke)
CREATE POLICY "Admins can update api keys"
  ON api_keys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = api_keys.project_id
      AND is_org_admin(projects.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = api_keys.project_id
      AND is_org_admin(projects.organization_id)
    )
  );

-- Org admins can delete API keys
CREATE POLICY "Admins can delete api keys"
  ON api_keys FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = api_keys.project_id
      AND is_org_admin(projects.organization_id)
    )
  );

-- ----------------------------------------------------------------------------
-- STRIPE_CUSTOMERS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Superadmins can do anything
CREATE POLICY "Superadmins full access to stripe customers"
  ON stripe_customers FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Org admins can view stripe customer
CREATE POLICY "Admins can view stripe customer"
  ON stripe_customers FOR SELECT
  USING (is_org_admin(organization_id));

-- ----------------------------------------------------------------------------
-- STRIPE_PAYMENT_METHODS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Superadmins can do anything
CREATE POLICY "Superadmins full access to payment methods"
  ON stripe_payment_methods FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Org admins can view payment methods
CREATE POLICY "Admins can view payment methods"
  ON stripe_payment_methods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stripe_customers
      WHERE stripe_customers.id = stripe_payment_methods.stripe_customer_id
      AND is_org_admin(stripe_customers.organization_id)
    )
  );

-- ----------------------------------------------------------------------------
-- STRIPE_SUBSCRIPTIONS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Superadmins can do anything
CREATE POLICY "Superadmins full access to subscriptions"
  ON stripe_subscriptions FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Org admins can view subscriptions
CREATE POLICY "Admins can view subscriptions"
  ON stripe_subscriptions FOR SELECT
  USING (is_org_admin(organization_id));

-- Org members can view subscriptions (read-only)
CREATE POLICY "Members can view subscriptions"
  ON stripe_subscriptions FOR SELECT
  USING (is_org_member(organization_id));

-- ----------------------------------------------------------------------------
-- STRIPE_TRANSACTIONS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Superadmins can do anything
CREATE POLICY "Superadmins full access to transactions"
  ON stripe_transactions FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Org admins can view transactions
CREATE POLICY "Admins can view transactions"
  ON stripe_transactions FOR SELECT
  USING (is_org_admin(organization_id));

-- ----------------------------------------------------------------------------
-- ENTITLEMENTS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Superadmins can do anything
CREATE POLICY "Superadmins full access to entitlements"
  ON entitlements FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Org admins can view entitlements
CREATE POLICY "Admins can view entitlements"
  ON entitlements FOR SELECT
  USING (is_org_admin(organization_id));

-- Org members can view entitlements (to know limits)
CREATE POLICY "Members can view entitlements"
  ON entitlements FOR SELECT
  USING (is_org_member(organization_id));

-- ----------------------------------------------------------------------------
-- USAGE TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Superadmins can do anything
CREATE POLICY "Superadmins full access to usage"
  ON usage FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Org members can view usage for their projects
CREATE POLICY "Org members can view usage"
  ON usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = usage.project_id
      AND is_org_member(projects.organization_id)
    )
  );

-- ----------------------------------------------------------------------------
-- VALIDATION_LOGS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Superadmins can do anything
CREATE POLICY "Superadmins full access to validation logs"
  ON validation_logs FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Org members can view logs for their projects
CREATE POLICY "Org members can view validation logs"
  ON validation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = validation_logs.project_id
      AND is_org_member(projects.organization_id)
    )
  );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- ============================================================================
-- COMPLETE
-- ============================================================================

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

