-- ============================================================================
-- PROJECT MEMBERS TABLE
-- Many-to-many relationship between users and projects
-- ============================================================================

-- Table definition
CREATE TABLE public.project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

COMMENT ON TABLE project_members IS 'Many-to-many: users <-> projects with roles';

-- Indexes
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- Triggers
CREATE TRIGGER set_updated_at_project_members
  BEFORE UPDATE ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- PROJECT MEMBERS FUNCTIONS
-- Functions that query project_members table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_project_member(project_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members pm
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.project_id = project_id_param
    AND pm.user_id = auth.uid()
    AND p.deleted_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION public.is_project_member(UUID) IS 'Check if current user is a member of the project';

CREATE OR REPLACE FUNCTION public.is_project_admin(project_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members pm
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.project_id = project_id_param
    AND pm.user_id = auth.uid()
    AND pm.role = 'admin'
    AND p.deleted_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION public.is_project_admin(UUID) IS 'Check if current user is an admin of the project';

CREATE OR REPLACE FUNCTION public.can_manage_project(project_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN public.is_project_owner(project_id_param) OR public.is_project_admin(project_id_param);
END;
$$;

COMMENT ON FUNCTION public.can_manage_project(UUID) IS 'Check if current user can manage the project (owner or admin)';

CREATE OR REPLACE FUNCTION public.has_project_access(project_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.is_project_owner(project_id_param) OR public.is_project_member(project_id_param);
END;
$$;

COMMENT ON FUNCTION public.has_project_access(UUID) IS 'Check if current user has access to project (owner or member)';

CREATE OR REPLACE FUNCTION public.delete_project_cascade(project_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Hard delete related entities
  DELETE FROM public.api_keys WHERE project_id = project_id_param;
  DELETE FROM public.entitlements WHERE project_id = project_id_param;
  DELETE FROM public.project_members WHERE project_id = project_id_param;

  -- Soft delete the project
  UPDATE public.projects
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = project_id_param AND deleted_at IS NULL;

  result := jsonb_build_object('success', TRUE);

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.delete_project_cascade(UUID) IS 'Soft delete project and cascade to related entities';

-- ============================================================================
-- PROJECTS RLS POLICIES (project_members dependent)
-- These policies require project_members table and functions
-- ============================================================================

CREATE POLICY "Authenticated users can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR has_project_access(id)
    OR is_superadmin()
  );

CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    can_manage_project(id)
    OR is_superadmin()
  )
  WITH CHECK (
    can_manage_project(id)
    OR is_superadmin()
  );

-- ============================================================================
-- PROJECT MEMBERS RLS POLICIES
-- ============================================================================

-- RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project members"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    has_project_access(project_id)
    OR is_superadmin()
  );

CREATE POLICY "Authenticated users can add project members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    can_manage_project(project_id)
    OR is_superadmin()
  );

CREATE POLICY "Authenticated users can update project members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    can_manage_project(project_id)
    OR is_superadmin()
  )
  WITH CHECK (
    can_manage_project(project_id)
    OR is_superadmin()
  );

CREATE POLICY "Authenticated users can remove project members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    can_manage_project(project_id)
    OR is_superadmin()
  );

CREATE POLICY "Service role all members"
  ON project_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON TABLE project_members TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE project_members TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_project_admin(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_project(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_project_access(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_project_cascade(UUID) TO authenticated, service_role;
