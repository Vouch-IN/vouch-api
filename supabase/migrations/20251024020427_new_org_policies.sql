-- Function to auto-add owner as admin when org is created
CREATE OR REPLACE FUNCTION add_owner_to_org_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add owner as admin in organization_members
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'admin')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger on organization creation
DROP TRIGGER IF EXISTS trg_add_owner_to_org_members ON organizations;
CREATE TRIGGER trg_add_owner_to_org_members
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_org_members();

-- Updated is_org_owner function
CREATE OR REPLACE FUNCTION public.is_org_owner(org_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organizations
    WHERE id = org_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  );
$$;
