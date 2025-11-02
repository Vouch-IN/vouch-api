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
