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

-- Grants
GRANT ALL ON TABLE disposable_domain_sync_log TO anon, authenticated, service_role;
