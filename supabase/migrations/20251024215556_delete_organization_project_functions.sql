-- Function to delete project (reusable)
CREATE OR REPLACE FUNCTION delete_project_cascade(project_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Hard delete API keys
  DELETE FROM api_keys WHERE project_id = project_id_param;

  -- Soft delete project
  UPDATE projects
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = project_id_param;

  RAISE NOTICE 'Project % deleted', project_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete organization (calls delete_project for each)
CREATE OR REPLACE FUNCTION delete_organization_cascade(org_id_param TEXT)
RETURNS JSONB AS $$
DECLARE
  project_record RECORD;
  subscription_ids TEXT[];
  result JSONB;
BEGIN
  -- Get all project IDs before deleting
  FOR project_record IN
    SELECT id FROM projects
    WHERE organization_id = org_id_param
    AND deleted_at IS NULL
  LOOP
    PERFORM delete_project_cascade(project_record.id);
  END LOOP;

  -- Get subscription IDs to cancel in Stripe
  SELECT ARRAY_AGG(id)
  INTO subscription_ids
  FROM stripe_subscriptions
  WHERE organization_id = org_id_param
  AND status IN ('active', 'trialing', 'past_due')
  AND deleted_at IS NULL;

  -- Soft delete subscriptions
  UPDATE stripe_subscriptions
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE organization_id = org_id_param;

  -- Hard delete entitlements
  DELETE FROM entitlements WHERE organization_id = org_id_param;

  -- Hard delete organization members
  DELETE FROM organization_members WHERE organization_id = org_id_param;

  -- Soft delete organization
  UPDATE organizations
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = org_id_param;

  -- Return subscription IDs to cancel in Stripe
  result := jsonb_build_object(
    'success', TRUE,
    'subscription_ids', COALESCE(subscription_ids, ARRAY[]::TEXT[])
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_project_cascade TO service_role;
GRANT EXECUTE ON FUNCTION delete_organization_cascade TO service_role;
