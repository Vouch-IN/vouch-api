-- ============================================================================
-- ENTITLEMENTS TABLE
-- Project entitlements from various sources
-- ============================================================================

-- Table definition
CREATE TABLE public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('stripe', 'manual', 'promo', 'free')),
  validations_limit INTEGER NOT NULL,
  team_limit INTEGER NOT NULL,
  log_retention_days INTEGER NOT NULL,
  features TEXT[] NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE entitlements IS 'Project entitlements from Stripe subscriptions, manual grants, promos, or free tier.';
COMMENT ON COLUMN entitlements.features IS 'Array: [''pro_dashboard'', ''custom_risk_weights'', ''advanced_analytics'', ''priority_support'']';

-- Indexes
CREATE INDEX idx_entitlements_project ON entitlements(project_id);
CREATE INDEX idx_entitlements_source ON entitlements(source);

-- Triggers
CREATE TRIGGER set_updated_at_entitlements
  BEFORE UPDATE ON entitlements
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view entitlements"
  ON entitlements FOR SELECT
  TO authenticated
  USING (
    has_project_access(project_id)
    OR is_superadmin()
  );

CREATE POLICY "Superadmins can insert entitlements"
  ON entitlements FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can update entitlements"
  ON entitlements FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can delete entitlements"
  ON entitlements FOR DELETE
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Service role all entitlements"
  ON entitlements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON TABLE entitlements TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE entitlements TO service_role;
