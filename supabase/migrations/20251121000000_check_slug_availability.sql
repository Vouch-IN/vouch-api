-- ============================================================================
-- CHECK SLUG AVAILABILITY FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_slug_availability(slug_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if the slug exists in the projects table
  -- Returns true if the slug is NOT found (available)
  -- Returns false if the slug IS found (taken)
  -- Note: Soft-deleted projects have their slugs renamed, so we don't need to explicitly check deleted_at
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE slug = slug_param
  );
END;
$$;

COMMENT ON FUNCTION public.check_slug_availability(TEXT) IS 'Check if a project slug is available for use. Returns true if available, false if taken.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_slug_availability(TEXT) TO authenticated;
