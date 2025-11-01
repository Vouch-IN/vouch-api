-- ============================================================================
-- DISPOSABLE DOMAIN SYNC LOG TABLE
-- Logging for disposable domain list syncing
-- ============================================================================

-- Table definition
CREATE TABLE public.disposable_domain_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at TIMESTAMPTZ DEFAULT now(),
  total_domains INTEGER NOT NULL,
  domains_added INTEGER NOT NULL,
  domains_removed INTEGER NOT NULL,
  added_domains TEXT[],
  removed_domains TEXT[],
  sources TEXT[] NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT
);

COMMENT ON TABLE disposable_domain_sync_log IS 'Log of disposable domain list sync operations';

-- Indexes
CREATE INDEX idx_sync_log_synced_at ON disposable_domain_sync_log(synced_at DESC);

-- RLS
ALTER TABLE disposable_domain_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view sync logs"
  ON disposable_domain_sync_log FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Service role full access to sync logs"
  ON disposable_domain_sync_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON TABLE disposable_domain_sync_log TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE disposable_domain_sync_log TO service_role;
