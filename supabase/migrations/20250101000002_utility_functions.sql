-- ============================================================================
-- UTILITY FUNCTIONS
-- Core functions that don't depend on tables
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS 'Trigger function to auto-update updated_at timestamp';

-- Hash API key using SHA256
CREATE OR REPLACE FUNCTION public.hash_api_key(key_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN encode(extensions.digest(key_value, 'sha256'), 'hex');
END;
$$;

COMMENT ON FUNCTION public.hash_api_key(TEXT) IS 'Hash API key value using SHA256';

-- Generate API key with proper format
CREATE OR REPLACE FUNCTION public.generate_api_key(type TEXT, environment TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  prefix TEXT;
  env_suffix TEXT;
  random_part TEXT;
  key_value TEXT;
  i INT;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
BEGIN
  prefix := CASE WHEN type = 'server' THEN 'sk' ELSE 'pk' END;
  env_suffix := CASE WHEN environment = 'live' THEN 'live' ELSE 'test' END;

  -- Generate 32 random lowercase letters and numbers
  random_part := '';
  FOR i IN 1..32 LOOP
    random_part := random_part || substr(chars, floor(random() * 36)::int + 1, 1);
  END LOOP;

  key_value := prefix || '_' || env_suffix || '_' || random_part;

  RETURN key_value;
END;
$$;

COMMENT ON FUNCTION public.generate_api_key(TEXT, TEXT) IS 'Generate API key in format: {sk|pk}_{test|live}_{random32chars}';

-- Delete old validation logs (90 days)
CREATE OR REPLACE FUNCTION public.delete_old_logs()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.validation_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

COMMENT ON FUNCTION public.delete_old_logs() IS 'Delete validation logs older than 90 days';

-- Check if current session is service role
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT auth.role() = 'service_role');
END;
$$;

COMMENT ON FUNCTION public.is_service_role() IS 'Check if current session is using service_role';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hash_api_key(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_api_key(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_old_logs() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_service_role() TO anon, authenticated, service_role;
