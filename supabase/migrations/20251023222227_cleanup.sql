-- ============================================================================
-- CLEANUP: Drop all existing tables, functions, triggers
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS "Sync API Keys to Worker" ON public.api_keys;
DROP TRIGGER IF EXISTS "Sync Projects to Worker" ON public.projects;
DROP TRIGGER IF EXISTS "Sync Subscriptions to Worker" ON public.subscriptions;
DROP TRIGGER IF EXISTS trg_sync_auth_users_to_public ON auth.users;

-- Drop tables (cascades will handle foreign keys)
DROP TABLE IF EXISTS public.validation_logs CASCADE;
DROP TABLE IF EXISTS public.usage CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.disposable_domain_sync_log CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.delete_old_logs();
DROP FUNCTION IF EXISTS public.reset_usage_for_project(text, timestamptz);
DROP FUNCTION IF EXISTS public.sync_auth_user_to_public();
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP FUNCTION IF EXISTS public.is_superadmin();
DROP FUNCTION IF EXISTS public.is_org_member(text);
DROP FUNCTION IF EXISTS public.is_org_admin(text);
DROP FUNCTION IF EXISTS public.is_org_owner(text);
DROP FUNCTION IF EXISTS public.user_organizations();
