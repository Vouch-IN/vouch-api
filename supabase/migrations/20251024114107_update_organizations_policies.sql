-- Allow stripe_customers to reference non-existent orgs temporarily
ALTER TABLE stripe_customers
  DROP CONSTRAINT IF EXISTS stripe_customers_organization_id_fkey;

-- Add it back as DEFERRABLE (checked at transaction end)
ALTER TABLE stripe_customers
  ADD CONSTRAINT stripe_customers_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;
