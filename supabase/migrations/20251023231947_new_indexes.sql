-- Simpler: one Stripe entitlement per org at a time
ALTER TABLE entitlements
  ADD CONSTRAINT entitlements_org_source_unique
  UNIQUE (organization_id, source);

