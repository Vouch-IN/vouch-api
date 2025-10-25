-- ============================================================================
-- 1. DROP ALL POLICIES THAT DEPEND ON organization_id
-- ============================================================================

-- Projects policies
DROP POLICY IF EXISTS "Org members can view projects" ON projects;
DROP POLICY IF EXISTS "Admins can create projects" ON projects;
DROP POLICY IF EXISTS "Admins can update projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;
DROP POLICY IF EXISTS "Superadmins full access to projects" ON projects;

-- API Keys policies
DROP POLICY IF EXISTS "Org members can view api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can create api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can update api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can delete api keys" ON api_keys;
DROP POLICY IF EXISTS "Superadmins full access to api keys" ON api_keys;

-- Usage policies
DROP POLICY IF EXISTS "Org members can view usage" ON usage;
DROP POLICY IF EXISTS "Superadmins full access to usage" ON usage;

-- Validation logs policies
DROP POLICY IF EXISTS "Org members can view validation logs" ON validation_logs;
DROP POLICY IF EXISTS "Superadmins full access to validation logs" ON validation_logs;
