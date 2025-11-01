-- ============================================================================
-- STRIPE TRANSACTIONS TABLE
-- Payment transactions for audit trail
-- ============================================================================

-- Table definition
CREATE TABLE public.stripe_transactions (
  id TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('charge', 'refund', 'payout', 'adjustment')),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  processed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE stripe_transactions IS 'Payment transactions. ID from Stripe (ch_..., re_...). Admin-visible only.';

-- Indexes
CREATE INDEX idx_transactions_project ON stripe_transactions(project_id);
CREATE INDEX idx_transactions_processed ON stripe_transactions(processed_at DESC);
CREATE INDEX idx_transactions_type ON stripe_transactions(type);
CREATE INDEX idx_transactions_status ON stripe_transactions(status);

-- RLS
ALTER TABLE stripe_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view transactions"
  ON stripe_transactions FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "Service role full access to transactions"
  ON stripe_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE stripe_transactions TO anon, authenticated, service_role;
