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

CREATE POLICY "Members can view team"
  ON project_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_project_owner(project_id));

CREATE POLICY "Owners can manage team"
  ON project_members FOR ALL
  TO authenticated
  USING (is_project_owner(project_id))
  WITH CHECK (is_project_owner(project_id));

CREATE POLICY "Service role all members"
  ON project_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE project_members TO anon, authenticated, service_role;
