-- Add quantity to subscriptions (default 1 for existing)
ALTER TABLE stripe_subscriptions
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

-- Add index for faster project counting
CREATE INDEX IF NOT EXISTS idx_projects_org_active
  ON projects(organization_id)
  WHERE deleted_at IS NULL;

-- Function to sync subscription quantity with project count
CREATE OR REPLACE FUNCTION sync_subscription_quantity()
RETURNS TRIGGER AS $$
DECLARE
  project_count INTEGER;
  sub_id TEXT;
BEGIN
  -- Count active projects
  SELECT COUNT(*) INTO project_count
  FROM projects
  WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
  AND deleted_at IS NULL;

  -- Get active subscription
  SELECT id INTO sub_id
  FROM stripe_subscriptions
  WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
  AND status IN ('active', 'trialing')
  AND deleted_at IS NULL
  LIMIT 1;

  -- Update quantity if subscription exists
  IF sub_id IS NOT NULL THEN
    UPDATE stripe_subscriptions
    SET quantity = project_count,
        updated_at = NOW()
    WHERE id = sub_id;

    RAISE NOTICE 'Updated subscription % quantity to %', sub_id, project_count;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on project insert/delete/update
DROP TRIGGER IF EXISTS sync_subscription_on_project_change ON projects;
CREATE TRIGGER sync_subscription_on_project_change
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_quantity();
