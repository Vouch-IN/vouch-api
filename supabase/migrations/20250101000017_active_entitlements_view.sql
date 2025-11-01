-- ============================================================================
-- ACTIVE ENTITLEMENTS MATERIALIZED VIEW
-- Aggregated view of active entitlements per project
-- ============================================================================

-- Materialized view definition
CREATE MATERIALIZED VIEW active_entitlements AS
SELECT
  p.id AS project_id,
  p.slug AS project_slug,
  p.name AS project_name,
  p.owner_id,
  COALESCE(MAX(e.validations_limit), 1000) AS validations_limit,
  COALESCE(MAX(e.log_retention_days), 7) AS log_retention_days,
  COALESCE(
    (
      SELECT ARRAY_AGG(DISTINCT elem)
      FROM (
        SELECT unnest(array_agg(e2.features)) AS elem
        FROM entitlements e2
        WHERE e2.project_id = p.id
        AND (e2.ends_at IS NULL OR e2.ends_at > now())
      ) sub
    ),
    ARRAY[]::TEXT[]
  ) AS features,
  MIN(e.starts_at) AS first_entitlement_start,
  CASE
    WHEN bool_or(e.ends_at IS NULL) THEN NULL
    ELSE MAX(e.ends_at)
  END AS latest_entitlement_end,
  COALESCE(bool_or(e.ends_at IS NULL OR e.ends_at > now()), true) AS is_active,
  COALESCE(
    ARRAY_AGG(DISTINCT e.source) FILTER (WHERE e.source IS NOT NULL),
    ARRAY['free']::TEXT[]
  ) AS sources,
  (
    SELECT json_build_object(
      'id', s.id,
      'product_name', s.product_name,
      'amount', s.amount,
      'currency', s.currency,
      'interval', s.interval,
      'status', s.status,
      'current_period_start', s.current_period_start,
      'current_period_end', s.current_period_end,
      'cancel_at_period_end', s.cancel_at_period_end,
      'canceled_at', s.canceled_at,
      'trial_end', s.trial_end
    )
    FROM stripe_subscriptions s
    WHERE s.project_id = p.id
    AND s.deleted_at IS NULL
    ORDER BY s.created_at DESC
    LIMIT 1
  ) AS subscription_info,
  now() AS last_refreshed
FROM projects p
LEFT JOIN entitlements e
  ON e.project_id = p.id
  AND (e.ends_at IS NULL OR e.ends_at > now())
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.slug, p.name, p.owner_id;

COMMENT ON MATERIALIZED VIEW active_entitlements IS 'Aggregated active entitlements per project with subscription info for UI display';

-- Indexes
CREATE UNIQUE INDEX idx_active_entitlements_project ON active_entitlements(project_id);
CREATE INDEX idx_active_entitlements_owner ON active_entitlements(owner_id);
CREATE INDEX idx_active_entitlements_expiring ON active_entitlements(latest_entitlement_end) WHERE latest_entitlement_end IS NOT NULL;

-- Refresh function
CREATE OR REPLACE FUNCTION public.refresh_entitlement_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_entitlements;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.refresh_entitlement_summary() IS 'Refresh active_entitlements materialized view';

-- Triggers to auto-refresh the view
CREATE TRIGGER trg_refresh_on_entitlement_change
  AFTER INSERT OR UPDATE OR DELETE ON entitlements
  FOR EACH ROW
  EXECUTE FUNCTION refresh_entitlement_summary();

CREATE TRIGGER trg_refresh_on_project_change
  AFTER INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION refresh_entitlement_summary();

CREATE TRIGGER trg_refresh_on_subscription_change
  AFTER INSERT OR UPDATE OR DELETE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION refresh_entitlement_summary();

-- RLS Policies for Materialized View
-- Note: RLS on materialized views works by creating a regular view with RLS on top
-- Alternatively, use functions with security definer or filter in application layer

-- Create a secure function to query entitlements with RLS
CREATE OR REPLACE FUNCTION public.get_project_entitlements(p_project_id UUID)
RETURNS TABLE (
  project_id UUID,
  project_slug TEXT,
  project_name TEXT,
  owner_id UUID,
  validations_limit INTEGER,
  log_retention_days INTEGER,
  features TEXT[],
  first_entitlement_start TIMESTAMPTZ,
  latest_entitlement_end TIMESTAMPTZ,
  is_active BOOLEAN,
  sources TEXT[],
  subscription_info JSON,
  last_refreshed TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Only allow access if user has project access or is superadmin
  IF NOT (has_project_access(p_project_id) OR is_superadmin()) THEN
    RAISE EXCEPTION 'Access denied to project entitlements';
  END IF;

  RETURN QUERY
  SELECT ae.*
  FROM active_entitlements ae
  WHERE ae.project_id = p_project_id;
END;
$$;

COMMENT ON FUNCTION public.get_project_entitlements(UUID) IS 'Securely get project entitlements with RLS enforcement';

-- Grants
GRANT SELECT ON active_entitlements TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_entitlement_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_project_entitlements(UUID) TO authenticated, service_role;
