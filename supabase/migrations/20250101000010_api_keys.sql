-- ============================================================================
-- API KEYS TABLE
-- Project API keys for authentication
-- ============================================================================

-- Table definition
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key_value TEXT UNIQUE,
  key_hash TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('client', 'server')),
  environment TEXT NOT NULL CHECK (environment IN ('test', 'live')),
  name TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE api_keys IS 'Project API keys for client and server use';

-- Indexes
CREATE INDEX idx_api_keys_project_id ON api_keys(project_id);
CREATE INDEX idx_api_keys_key_value ON api_keys(key_value);

-- Function to generate initial API keys for new projects
CREATE OR REPLACE FUNCTION public.generate_initial_api_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  client_test_key TEXT;
  server_test_key TEXT;
  client_live_key TEXT;
  server_live_key TEXT;
BEGIN
  -- Generate keys
  client_test_key := public.generate_api_key('client', 'test');
  server_test_key := public.generate_api_key('server', 'test');
  client_live_key := public.generate_api_key('client', 'live');
  server_live_key := public.generate_api_key('server', 'live');

  -- Insert client test key
  INSERT INTO public.api_keys (
    id, project_id, name, key_value, key_hash, type, environment, created_at
  ) VALUES (
    gen_random_uuid(), NEW.id, 'Default Client Key', client_test_key,
    public.hash_api_key(client_test_key), 'client', 'test', NOW()
  );

  -- Insert server test key
  INSERT INTO public.api_keys (
    id, project_id, name, key_value, key_hash, type, environment, created_at
  ) VALUES (
    gen_random_uuid(), NEW.id, 'Default Server Key', server_test_key,
    public.hash_api_key(server_test_key), 'server', 'test', NOW()
  );

  -- Insert client live key
  INSERT INTO public.api_keys (
    id, project_id, name, key_value, key_hash, type, environment, created_at
  ) VALUES (
    gen_random_uuid(), NEW.id, 'Default Client Key (Live)', client_live_key,
    public.hash_api_key(client_live_key), 'client', 'live', NOW()
  );

  -- Insert server live key
  INSERT INTO public.api_keys (
    id, project_id, name, key_value, key_hash, type, environment, created_at
  ) VALUES (
    gen_random_uuid(), NEW.id, 'Default Server Key (Live)', server_live_key,
    public.hash_api_key(server_live_key), 'server', 'live', NOW()
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.generate_initial_api_keys() IS 'Auto-generate 4 API keys (client/server x test/live) for new projects';

-- Triggers
CREATE TRIGGER trg_generate_initial_api_keys
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION generate_initial_api_keys();

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view api keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (
    has_project_access(project_id)
    OR is_superadmin()
  );

CREATE POLICY "Authenticated users can create api keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    can_manage_project(project_id)
    OR is_superadmin()
  );

CREATE POLICY "Authenticated users can update api keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (
    can_manage_project(project_id)
    OR is_superadmin()
  )
  WITH CHECK (
    can_manage_project(project_id)
    OR is_superadmin()
  );

CREATE POLICY "Authenticated users can delete api keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (
    can_manage_project(project_id)
    OR is_superadmin()
  );

CREATE POLICY "Service role all api keys"
  ON api_keys FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON TABLE api_keys TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE api_keys TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_initial_api_keys() TO service_role;
