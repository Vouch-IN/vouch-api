-- Create materialized view (cached, fast reads with fallbacks)
CREATE MATERIALIZED VIEW active_entitlement_summary AS
SELECT
  e.organization_id,
  o.name AS organization_name,

  -- Fallback to 1000 if no entitlements
  COALESCE(MAX(e.validations_limit), 1000) AS validations_limit,

  -- Fallback to 7 if no entitlements
  COALESCE(MAX(e.log_retention_days), 7) AS log_retention_days,

  -- Fallback to empty array if no features
  COALESCE(
    (
      SELECT ARRAY_AGG(DISTINCT elem)
      FROM (
        SELECT unnest(array_agg(e2.features)) AS elem
        FROM entitlements e2
        WHERE e2.organization_id = e.organization_id
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

  -- Always true (if org exists, it's active with at least free tier)
  COALESCE(bool_or(e.ends_at IS NULL OR e.ends_at > now()), true) AS is_active,

  -- Fallback to ['free'] if no sources
  COALESCE(ARRAY_AGG(DISTINCT e.source) FILTER (WHERE e.source IS NOT NULL), ARRAY['free']::TEXT[]) AS sources,

  now() AS last_refreshed

FROM organizations o
LEFT JOIN entitlements e
  ON e.organization_id = o.id
  AND (e.ends_at IS NULL OR e.ends_at > now())
WHERE o.deleted_at IS NULL
GROUP BY e.organization_id, o.name;

-- Index for fast lookups
CREATE UNIQUE INDEX idx_active_entitlement_summary_org
  ON active_entitlement_summary(organization_id);

-- Grant access
GRANT SELECT ON active_entitlement_summary TO anon, authenticated, service_role;

-- Auto-refresh on entitlement changes
CREATE OR REPLACE FUNCTION refresh_entitlement_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_entitlement_summary;
  RETURN NULL;
END;
$$;

-- Trigger on entitlements table
CREATE TRIGGER trg_refresh_entitlement_summary
  AFTER INSERT OR UPDATE OR DELETE ON entitlements
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_entitlement_summary();

-- Also refresh when organizations are created/updated
CREATE TRIGGER trg_refresh_on_org_change
  AFTER INSERT OR UPDATE ON organizations
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_entitlement_summary();

COMMENT ON MATERIALIZED VIEW active_entitlement_summary IS 'Merged active entitlements per org with free tier fallback (1000 validations, 7 days retention)';
