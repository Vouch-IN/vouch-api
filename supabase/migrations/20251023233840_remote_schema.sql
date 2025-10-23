set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_owner(org_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = org_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_superadmin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND is_superadmin = TRUE
    AND deleted_at IS NULL
  );
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_entitlement_summary()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_entitlement_summary;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = now()
  WHERE
    public.users.email IS DISTINCT FROM EXCLUDED.email
    OR public.users.name IS DISTINCT FROM EXCLUDED.name;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_organizations()
 RETURNS SETOF text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid();
$function$
;



