-- ============================================================================
-- VALIDATION LOGS TABLE
-- Email validation request logs
-- ============================================================================

-- Table definition
CREATE TABLE public.validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
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

COMMENT ON TABLE validation_logs IS 'Email validation logs. Auto-deleted based on project entitlements.';

-- Indexes
CREATE INDEX idx_validation_logs_project_created ON validation_logs(project_id, created_at DESC);
CREATE INDEX idx_validation_logs_fingerprint ON validation_logs(fingerprint_id) WHERE fingerprint_id IS NOT NULL;
CREATE INDEX idx_validation_logs_email_hash ON validation_logs(email_hash);
CREATE INDEX idx_validation_logs_recommendation ON validation_logs(recommendation);
CREATE INDEX idx_validation_logs_risk_score ON validation_logs(risk_score);
CREATE INDEX idx_validation_logs_created ON validation_logs(created_at DESC);
CREATE INDEX idx_validation_logs_ip ON validation_logs(ip_address) WHERE ip_address IS NOT NULL;

-- RLS
ALTER TABLE validation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view validation logs"
  ON validation_logs FOR SELECT
  TO authenticated
  USING (
    has_project_access(project_id)
    OR is_superadmin()
  );

CREATE POLICY "Service role full access to logs"
  ON validation_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON TABLE validation_logs TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE validation_logs TO service_role;
