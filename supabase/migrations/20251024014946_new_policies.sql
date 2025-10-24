-- Drop existing policies
DROP POLICY IF EXISTS "Superadmins full access to organizations" ON organizations;
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;

-- Superadmins can do everything
CREATE POLICY "Superadmins full access to organizations"
  ON organizations FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Any authenticated user can create an org (they become owner)
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Members can view orgs they belong to
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    is_org_member(id)
    OR owner_id = auth.uid()
  );

-- Owners can update their orgs
CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owners can delete their orgs
CREATE POLICY "Owners can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());


-- Drop existing policies
DROP POLICY IF EXISTS "Superadmins full access to projects" ON projects;
DROP POLICY IF EXISTS "Org members can view projects" ON projects;
DROP POLICY IF EXISTS "Admins can create projects" ON projects;
DROP POLICY IF EXISTS "Admins can update projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;

-- Superadmins can do everything
CREATE POLICY "Superadmins full access to projects"
  ON projects FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Org members can view all projects in their org
CREATE POLICY "Org members can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (is_org_member(organization_id));

-- Org admins and owners can create projects
CREATE POLICY "Admins can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    is_org_admin(organization_id)
    OR is_org_owner(organization_id)
  );

-- Org admins and owners can update projects
CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    is_org_admin(organization_id)
    OR is_org_owner(organization_id)
  )
  WITH CHECK (
    is_org_admin(organization_id)
    OR is_org_owner(organization_id)
  );

-- Org admins and owners can delete projects
CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    is_org_admin(organization_id)
    OR is_org_owner(organization_id)
  );
