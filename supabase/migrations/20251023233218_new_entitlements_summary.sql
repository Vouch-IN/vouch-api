
-- ============================================================================
-- DROP AND RECREATE ACTIVE ENTITLEMENT SUMMARY
-- ============================================================================

-- Drop existing
DROP MATERIALIZED VIEW IF EXISTS active_entitlement_summary CASCADE;
-- Drop existing triggers first
DROP TRIGGER IF EXISTS trg_refresh_on_entitlement_change ON entitlements;
DROP TRIGGER IF EXISTS trg_refresh_on_subscription_change ON stripe_subscriptions;
DROP TRIGGER IF EXISTS trg_refresh_on_org_change ON organizations;

-- Create materialized view (no usage stats)
CREATE MATERIALIZED VIEW active_entitlement_summary AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,

  -- Fallback to free tier
  COALESCE(MAX(e.validations_limit), 1000) AS validations_limit,
  COALESCE(MAX(e.log_retention_days), 7) AS log_retention_days,

  -- Merge all features
  COALESCE(
    (
      SELECT ARRAY_AGG(DISTINCT elem)
      FROM (
        SELECT unnest(array_agg(e2.features)) AS elem
        FROM entitlements e2
        WHERE e2.organization_id = o.id
        AND (e2.ends_at IS NULL OR e2.ends_at > now())
      ) sub
    ),
    ARRAY[]::TEXT[]
  ) AS features,

  -- Dates
  MIN(e.starts_at) AS first_entitlement_start,
  CASE
    WHEN bool_or(e.ends_at IS NULL) THEN NULL
    ELSE MAX(e.ends_at)
  END AS latest_entitlement_end,

  -- Always active
  COALESCE(bool_or(e.ends_at IS NULL OR e.ends_at > now()), true) AS is_active,

  -- Sources
  COALESCE(
    ARRAY_AGG(DISTINCT e.source) FILTER (WHERE e.source IS NOT NULL),
    ARRAY['free']::TEXT[]
  ) AS sources,

  -- Subscription info
  (
    SELECT json_build_object(
      'id', s.id,
      'status', s.status,
      'renewal_date', s.current_period_end,
      'canceling', s.cancel_at_period_end,
      'trial_ends', s.trial_end
    )
    FROM stripe_subscriptions s
    WHERE s.organization_id = o.id
    AND s.status IN ('active', 'trialing')
    ORDER BY s.current_period_end DESC
    LIMIT 1
  ) AS subscription_info,

  now() AS last_refreshed

FROM organizations o
LEFT JOIN entitlements e
  ON e.organization_id = o.id
  AND (e.ends_at IS NULL OR e.ends_at > now())
WHERE o.deleted_at IS NULL
GROUP BY o.id, o.name;

-- Indexes
CREATE UNIQUE INDEX idx_active_entitlement_summary_org
  ON active_entitlement_summary(organization_id);

-- Replace this index
CREATE INDEX idx_active_entitlement_summary_expiring
  ON active_entitlement_summary(latest_entitlement_end)
  WHERE latest_entitlement_end IS NOT NULL;

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_entitlement_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_entitlement_summary;
  RETURN NULL;
END;
$$;

-- Triggers
CREATE TRIGGER trg_refresh_on_entitlement_change
  AFTER INSERT OR UPDATE OR DELETE ON entitlements
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_entitlement_summary();

CREATE TRIGGER trg_refresh_on_subscription_change
  AFTER INSERT OR UPDATE OR DELETE ON stripe_subscriptions
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_entitlement_summary();

CREATE TRIGGER trg_refresh_on_org_change
  AFTER INSERT OR UPDATE ON organizations
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_entitlement_summary();


-- Grants
GRANT SELECT ON active_entitlement_summary TO anon, authenticated, service_role;
