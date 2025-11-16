-- ============================================================================
-- REMOVE RISK WEIGHT AND THRESHOLD REFERENCES
-- Clean up deprecated risk configuration fields from comments
-- ============================================================================

-- Update projects.settings comment to remove riskWeights and thresholds
COMMENT ON COLUMN public.projects.settings IS 'JSONB: { blacklist, whitelist, allowedDomains, validations }';

-- Update entitlements.features comment to remove custom_risk_weights
COMMENT ON COLUMN public.entitlements.features IS 'Array: [''pro_dashboard'', ''advanced_analytics'', ''priority_support'']';
