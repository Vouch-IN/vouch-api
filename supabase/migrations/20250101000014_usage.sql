-- ============================================================================
-- USAGE TABLE
-- Monthly validation usage tracking per project
-- ============================================================================

-- Table definition
CREATE TABLE public.usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  count INTEGER NOT NULL DEFAULT 0,
  limit_exceeded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, month)
);

COMMENT ON TABLE usage IS 'Monthly validation usage per project. Format: YYYY-MM';

-- Indexes
CREATE UNIQUE INDEX idx_usage_project_month ON usage(project_id, month);
CREATE INDEX idx_usage_month ON usage(month);
CREATE INDEX idx_usage_exceeded ON usage(project_id) WHERE limit_exceeded_at IS NOT NULL;

-- Triggers
CREATE TRIGGER set_updated_at_usage
  BEFORE UPDATE ON usage
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view usage"
  ON usage FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "Superadmins full access usage"
  ON usage FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Grants
GRANT ALL ON TABLE usage TO anon, authenticated, service_role;
