-- ============================================================================
-- CLEANUP VALIDATION LOGS
-- Remove deprecated is_valid and risk_score fields
-- Keep only recommendation (allow/flag/block) and signals for decision tracking
-- ============================================================================

-- Drop the materialized view first (we'll recreate it without avg_risk_score)
DROP MATERIALIZED VIEW IF EXISTS public.validation_logs_daily CASCADE;

-- Drop indexes on fields we're removing
DROP INDEX IF EXISTS public.idx_validation_logs_risk_score;

-- Remove is_valid and risk_score columns from validation_logs
ALTER TABLE public.validation_logs
  DROP COLUMN IF EXISTS is_valid,
  DROP COLUMN IF EXISTS risk_score;

-- Recreate the validation_logs_daily materialized view without avg_risk_score
CREATE MATERIALIZED VIEW validation_logs_daily AS
SELECT
  vl.project_id,
  DATE(vl.created_at AT TIME ZONE 'UTC') AS date,
  COUNT(*) AS count,
  COUNT(*) FILTER (WHERE vl.recommendation = 'allow') AS allowed,
  COUNT(*) FILTER (WHERE vl.recommendation = 'block') AS blocked,
  COUNT(*) FILTER (WHERE vl.recommendation = 'flag') AS flagged,
  -- Keep only latency metrics
  AVG(vl.latency_ms)::INTEGER AS avg_latency_ms,
  MIN(vl.created_at) AS first_validation,
  MAX(vl.created_at) AS last_validation,
  now() AS last_refreshed
FROM validation_logs vl
WHERE vl.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY vl.project_id, DATE(vl.created_at AT TIME ZONE 'UTC');

COMMENT ON MATERIALIZED VIEW validation_logs_daily IS 'Daily aggregated validation log statistics per project. Refreshes every 6 hours.';

-- Recreate indexes for optimal query performance
CREATE UNIQUE INDEX idx_validation_logs_daily_project_date ON validation_logs_daily(project_id, date DESC);
CREATE INDEX idx_validation_logs_daily_date ON validation_logs_daily(date DESC);
CREATE INDEX idx_validation_logs_daily_project ON validation_logs_daily(project_id);
CREATE INDEX idx_validation_logs_daily_last_refreshed ON validation_logs_daily(last_refreshed);

-- Drop existing functions before recreating with new return type signatures
DROP FUNCTION IF EXISTS public.get_validation_logs_daily(UUID, DATE, DATE, INTEGER);
DROP FUNCTION IF EXISTS public.get_all_validation_logs_daily(DATE, DATE, INTEGER);

-- Recreate get_validation_logs_daily function with updated return type
CREATE FUNCTION public.get_validation_logs_daily(
  p_project_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 90
)
RETURNS TABLE (
  project_id UUID,
  date DATE,
  count BIGINT,
  allowed BIGINT,
  blocked BIGINT,
  flagged BIGINT,
  avg_latency_ms INTEGER,
  first_validation TIMESTAMPTZ,
  last_validation TIMESTAMPTZ,
  last_refreshed TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Only allow access if user has project access or is superadmin
  IF NOT (public.has_project_access(p_project_id) OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'Access denied to validation logs for this project';
  END IF;

  -- Validate and set date range
  -- Default to last 90 days if not specified
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '90 days');

  -- Ensure start date is not after end date
  IF v_start_date > v_end_date THEN
    RAISE EXCEPTION 'Start date cannot be after end date';
  END IF;

  -- Limit maximum range to prevent abuse (max 365 days)
  IF v_end_date - v_start_date > 365 THEN
    RAISE EXCEPTION 'Date range cannot exceed 365 days';
  END IF;

  -- Validate limit parameter
  IF p_limit < 1 OR p_limit > 365 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 365';
  END IF;

  -- Return filtered results
  RETURN QUERY
  SELECT
    vld.project_id,
    vld.date,
    vld.count,
    vld.allowed,
    vld.blocked,
    vld.flagged,
    vld.avg_latency_ms,
    vld.first_validation,
    vld.last_validation,
    vld.last_refreshed
  FROM public.validation_logs_daily vld
  WHERE vld.project_id = p_project_id
    AND vld.date >= v_start_date
    AND vld.date <= v_end_date
  ORDER BY vld.date DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_validation_logs_daily(UUID, DATE, DATE, INTEGER) IS 'Securely get validation logs daily statistics with RLS enforcement and date range filtering';

-- Recreate get_all_validation_logs_daily function with updated return type
CREATE FUNCTION public.get_all_validation_logs_daily(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 1000
)
RETURNS TABLE (
  project_id UUID,
  date DATE,
  count BIGINT,
  allowed BIGINT,
  blocked BIGINT,
  flagged BIGINT,
  avg_latency_ms INTEGER,
  first_validation TIMESTAMPTZ,
  last_validation TIMESTAMPTZ,
  last_refreshed TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Only allow superadmins
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Access denied: superadmin privileges required';
  END IF;

  -- Validate and set date range
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '30 days');

  -- Ensure start date is not after end date
  IF v_start_date > v_end_date THEN
    RAISE EXCEPTION 'Start date cannot be after end date';
  END IF;

  -- Limit maximum range (max 90 days for all projects)
  IF v_end_date - v_start_date > 90 THEN
    RAISE EXCEPTION 'Date range cannot exceed 90 days for all projects query';
  END IF;

  -- Validate limit parameter
  IF p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 10000';
  END IF;

  -- Return filtered results
  RETURN QUERY
  SELECT
    vld.project_id,
    vld.date,
    vld.count,
    vld.allowed,
    vld.blocked,
    vld.flagged,
    vld.avg_latency_ms,
    vld.first_validation,
    vld.last_validation,
    vld.last_refreshed
  FROM public.validation_logs_daily vld
  WHERE vld.date >= v_start_date
    AND vld.date <= v_end_date
  ORDER BY vld.date DESC, vld.project_id
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_all_validation_logs_daily(DATE, DATE, INTEGER) IS 'Get validation logs daily statistics for all projects (superadmin only)';

-- Recreate the refresh function (no changes needed, but including for completeness)
CREATE OR REPLACE FUNCTION public.refresh_validation_logs_daily()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Use CONCURRENTLY to avoid locking the view during refresh
  -- This requires the unique index we created above
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.validation_logs_daily;

  -- Log refresh for monitoring
  RAISE NOTICE 'Refreshed validation_logs_daily at %', now();
END;
$$;

COMMENT ON FUNCTION public.refresh_validation_logs_daily() IS 'Refresh validation_logs_daily materialized view (called via pg_cron every 6 hours)';

-- Regrant permissions
REVOKE SELECT ON validation_logs_daily FROM anon, authenticated;
GRANT SELECT ON validation_logs_daily TO service_role, authenticator;

GRANT EXECUTE ON FUNCTION public.refresh_validation_logs_daily() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_validation_logs_daily(UUID, DATE, DATE, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_all_validation_logs_daily(DATE, DATE, INTEGER) TO authenticated, service_role;

-- Initial refresh to populate the view
REFRESH MATERIALIZED VIEW validation_logs_daily;
