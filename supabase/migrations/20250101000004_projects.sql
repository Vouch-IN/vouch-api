-- ============================================================================
-- PROJECTS TABLE
-- Core project entity with slug-based IDs
-- ============================================================================

-- Table definition
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stripe_customer_id TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

COMMENT ON TABLE projects IS 'Projects. Slug-based IDs for clean URLs.';
COMMENT ON COLUMN projects.settings IS 'JSONB: { blacklist, whitelist, allowedDomains, riskWeights, thresholds, validations }';
COMMENT ON COLUMN projects.stripe_customer_id IS 'Stripe customer ID (cus_...). One per project.';

-- Indexes
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_deleted ON projects(deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_projects_slug_unique_active ON projects(slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_projects_stripe_customer_id_unique_active ON projects(stripe_customer_id) WHERE deleted_at IS NULL;

-- Project-specific functions
CREATE OR REPLACE FUNCTION public.is_project_owner(project_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id_param
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION public.is_project_owner(UUID) IS 'Check if current user owns the project';

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

CREATE OR REPLACE FUNCTION public.handle_project_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Rename slug to deleted_{old_slug}_{timestamp}
    NEW.slug = 'deleted_' || OLD.slug || '_' || to_char(NOW(), 'YYYYMMDDHHmmss');
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_project_soft_delete() IS 'Auto-rename slug when project is soft deleted';

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

-- Triggers
CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_handle_project_soft_delete
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION handle_project_soft_delete();

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR is_superadmin()
  );

CREATE POLICY "Authenticated users can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = (SELECT auth.uid())
    )
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

CREATE POLICY "Authenticated users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    (owner_id = (SELECT auth.uid()) AND deleted_at IS NULL)
    OR is_superadmin()
  );

CREATE POLICY "Service role all projects"
  ON projects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON TABLE projects TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE projects TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_project_owner(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_project_admin(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_project(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_project_access(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_project_cascade(UUID) TO authenticated, service_role;
