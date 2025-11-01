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
  log_retention_days INTEGER NOT NULL,
  features TEXT[] NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE entitlements IS 'Project entitlements. Can exist independently of Stripe subscriptions.';
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

CREATE POLICY "Members can view entitlements"
  ON entitlements FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "Service role all entitlements"
  ON entitlements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE entitlements TO anon, authenticated, service_role;
