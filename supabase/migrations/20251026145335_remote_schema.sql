drop trigger if exists "trg_refresh_on_entitlement_change" on "public"."entitlements";

drop trigger if exists "trg_refresh_on_project_change" on "public"."projects";

drop trigger if exists "trg_refresh_on_subscription_change" on "public"."stripe_subscriptions";

drop policy "Members can view api keys" on "public"."api_keys";

drop policy "Owners can manage api keys" on "public"."api_keys";

drop policy "Members can view entitlements" on "public"."entitlements";

drop policy "Members can view team" on "public"."project_members";

drop policy "Owners can manage team" on "public"."project_members";

drop policy "Owners can delete projects" on "public"."projects";

drop policy "Owners can update projects" on "public"."projects";

drop policy "Users can view their projects" on "public"."projects";

drop policy "Members can view subscriptions" on "public"."stripe_subscriptions";

drop policy "Members can view usage" on "public"."usage";

drop policy "Members can view logs" on "public"."validation_logs";

alter table "public"."projects" drop constraint "projects_id_check";

drop function if exists "public"."delete_project_cascade"(project_id_param text);

drop materialized view if exists "public"."active_entitlements";

drop index if exists "public"."idx_api_keys_active";

drop index if exists "public"."idx_api_keys_hash";

drop index if exists "public"."idx_api_keys_last_used";

drop index if exists "public"."idx_api_keys_project";

drop index if exists "public"."idx_stripe_transactions_org";

drop index if exists "public"."idx_transactions_org";

drop index if exists "public"."idx_transactions_org_processed";

alter table "public"."api_keys" drop column "revoked_at";

alter table "public"."api_keys" add column "key_value" text;

alter table "public"."api_keys" alter column "project_id" set data type uuid using "project_id"::uuid;

alter table "public"."entitlements" alter column "project_id" set data type uuid using "project_id"::uuid;

alter table "public"."project_members" alter column "project_id" set data type uuid using "project_id"::uuid;

alter table "public"."projects" add column "slug" text not null;

alter table "public"."projects" add column "stripe_customer_id" text;

alter table "public"."projects" alter column "id" set default gen_random_uuid();

alter table "public"."projects" alter column "id" set data type uuid using "id"::uuid;

alter table "public"."stripe_subscriptions" add column "deleted_at" timestamp with time zone;

alter table "public"."stripe_subscriptions" alter column "project_id" set data type uuid using "project_id"::uuid;

alter table "public"."stripe_transactions" drop column "organization_id";

alter table "public"."stripe_transactions" add column "project_id" uuid;

alter table "public"."usage" alter column "project_id" set data type uuid using "project_id"::uuid;

alter table "public"."validation_logs" alter column "project_id" set data type uuid using "project_id"::uuid;

CREATE UNIQUE INDEX api_keys_key_value_unique ON public.api_keys USING btree (key_value);

CREATE INDEX idx_api_keys_key_value ON public.api_keys USING btree (key_value);

CREATE UNIQUE INDEX idx_projects_slug_unique_active ON public.projects USING btree (slug) WHERE (deleted_at IS NULL);

CREATE INDEX idx_subscriptions_deleted ON public.stripe_subscriptions USING btree (deleted_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_transactions_project ON public.stripe_transactions USING btree (project_id);

alter table "public"."api_keys" add constraint "api_keys_key_value_unique" UNIQUE using index "api_keys_key_value_unique";

alter table "public"."projects" add constraint "projects_stripe_customer_id_fkey" FOREIGN KEY (stripe_customer_id) REFERENCES stripe_customers(id) not valid;

alter table "public"."projects" validate constraint "projects_stripe_customer_id_fkey";

alter table "public"."projects" add constraint "slug_format" CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)) not valid;

alter table "public"."projects" validate constraint "slug_format";

alter table "public"."stripe_transactions" add constraint "stripe_transactions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."stripe_transactions" validate constraint "stripe_transactions_project_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.delete_project_cascade(project_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  subscription_ids TEXT[];
  result JSONB;
BEGIN
  SELECT ARRAY_AGG(id)
  INTO subscription_ids
  FROM stripe_subscriptions
  WHERE project_id = project_id_param
  AND status IN ('active', 'trialing', 'past_due')
  AND deleted_at IS NULL;

  DELETE FROM api_keys WHERE project_id = project_id_param;
  UPDATE stripe_subscriptions
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE project_id = project_id_param AND deleted_at IS NULL;
  DELETE FROM entitlements WHERE project_id = project_id_param;
  DELETE FROM project_members WHERE project_id = project_id_param;
  UPDATE projects
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = project_id_param AND deleted_at IS NULL;

  result := jsonb_build_object(
    'success', TRUE,
    'subscription_ids', COALESCE(subscription_ids, ARRAY[]::TEXT[])
  );

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_api_key(type text, environment text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  prefix TEXT;
  env_suffix TEXT;
  random_part TEXT;
  key_value TEXT;
  i INT;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
BEGIN
  prefix := CASE WHEN type = 'server' THEN 'sk' ELSE 'pk' END;
  env_suffix := CASE WHEN environment = 'live' THEN 'live' ELSE 'test' END;

  -- Generate 32 random lowercase letters and numbers
  random_part := '';
  FOR i IN 1..32 LOOP
    random_part := random_part || substr(chars, floor(random() * 36)::int + 1, 1);
  END LOOP;

  key_value := prefix || '_' || env_suffix || '_' || random_part;

  RETURN key_value;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_initial_api_keys()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
  client_test_key TEXT;
  server_test_key TEXT;
  client_live_key TEXT;
  server_live_key TEXT;
BEGIN
  -- Generate keys
  client_test_key := generate_api_key('client', 'test');
  server_test_key := generate_api_key('server', 'test');
  client_live_key := generate_api_key('client', 'live');
  server_live_key := generate_api_key('server', 'live');

  -- Insert client test key
  INSERT INTO api_keys (
    id, project_id, name, key_value, key_hash, type, environment, created_at
  ) VALUES (
    gen_random_uuid(), NEW.id, 'Default Client Key', client_test_key,
    hash_api_key(client_test_key), 'client', 'test', NOW()
  );

  -- Insert server test key
  INSERT INTO api_keys (
    id, project_id, name, key_value, key_hash, type, environment, created_at
  ) VALUES (
    gen_random_uuid(), NEW.id, 'Default Server Key', server_test_key,
    hash_api_key(server_test_key), 'server', 'test', NOW()
  );

  -- Insert client live key
  INSERT INTO api_keys (
    id, project_id, name, key_value, key_hash, type, environment, created_at
  ) VALUES (
    gen_random_uuid(), NEW.id, 'Default Client Key (Live)', client_live_key,
    hash_api_key(client_live_key), 'client', 'live', NOW()
  );

  -- Insert server live key
  INSERT INTO api_keys (
    id, project_id, name, key_value, key_hash, type, environment, created_at
  ) VALUES (
    gen_random_uuid(), NEW.id, 'Default Server Key (Live)', server_live_key,
    hash_api_key(server_live_key), 'server', 'live', NOW()
  );

  RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.handle_project_soft_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Rename slug to deleted_{old_slug}_{timestamp}
    NEW.slug = 'deleted_' || OLD.slug || '_' || to_char(NOW(), 'YYYYMMDDHHmmss');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_project_access(project_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN is_project_owner(project_id_param) OR is_project_member(project_id_param);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.hash_api_key(key_value text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN encode(digest(key_value, 'sha256'), 'hex');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_project_member(project_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members pm
    JOIN projects p ON p.id = pm.project_id
    WHERE pm.project_id = project_id_param
    AND pm.user_id = auth.uid()
    AND p.deleted_at IS NULL
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_project_owner(project_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id_param
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  );
END;
$function$
;

create materialized view "public"."active_entitlements" as  SELECT p.id AS project_id,
    p.slug AS project_slug,
    p.name AS project_name,
    p.owner_id,
    COALESCE(max(e.validations_limit), 1000) AS validations_limit,
    COALESCE(max(e.log_retention_days), 7) AS log_retention_days,
    COALESCE(( SELECT array_agg(DISTINCT sub.elem) AS array_agg
           FROM ( SELECT unnest(array_agg(e2.features)) AS elem
                   FROM entitlements e2
                  WHERE ((e2.project_id = p.id) AND ((e2.ends_at IS NULL) OR (e2.ends_at > now())))) sub), ARRAY[]::text[]) AS features,
    min(e.starts_at) AS first_entitlement_start,
        CASE
            WHEN bool_or((e.ends_at IS NULL)) THEN NULL::timestamp with time zone
            ELSE max(e.ends_at)
        END AS latest_entitlement_end,
    COALESCE(bool_or(((e.ends_at IS NULL) OR (e.ends_at > now()))), true) AS is_active,
    COALESCE(array_agg(DISTINCT e.source) FILTER (WHERE (e.source IS NOT NULL)), ARRAY['free'::text]) AS sources,
    ( SELECT json_build_object('id', s.id, 'status', s.status, 'renewal_date', s.current_period_end, 'canceling', s.cancel_at_period_end, 'trial_ends', s.trial_end) AS json_build_object
           FROM stripe_subscriptions s
          WHERE ((s.project_id = p.id) AND (s.status = ANY (ARRAY['active'::text, 'trialing'::text])) AND (s.deleted_at IS NULL))
          ORDER BY s.current_period_end DESC
         LIMIT 1) AS subscription_info,
    now() AS last_refreshed
   FROM (projects p
     LEFT JOIN entitlements e ON (((e.project_id = p.id) AND ((e.ends_at IS NULL) OR (e.ends_at > now())))))
  WHERE (p.deleted_at IS NULL)
  GROUP BY p.id, p.slug, p.name, p.owner_id;


CREATE OR REPLACE FUNCTION public.is_superadmin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean,
      false
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_entitlement_summary()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_entitlements;
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

create policy "Service role full access to customers"
on "public"."stripe_customers"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Users can view their own customer"
on "public"."stripe_customers"
as permissive
for select
to authenticated
using ((user_id = auth.uid()));


create policy "Project members can view payment methods"
on "public"."stripe_payment_methods"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM stripe_customers
  WHERE ((stripe_customers.id = stripe_payment_methods.stripe_customer_id) AND (stripe_customers.user_id = auth.uid())))));


create policy "Service role full access to payment methods"
on "public"."stripe_payment_methods"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Anyone can view active prices"
on "public"."stripe_prices"
as permissive
for select
to authenticated, anon
using (((active = true) AND (deleted_at IS NULL)));


create policy "Service role full access to prices"
on "public"."stripe_prices"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Anyone can view active products"
on "public"."stripe_products"
as permissive
for select
to authenticated, anon
using (((active = true) AND (deleted_at IS NULL)));


create policy "Service role full access to products"
on "public"."stripe_products"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Project members can view subscriptions"
on "public"."stripe_subscriptions"
as permissive
for select
to authenticated
using (((deleted_at IS NULL) AND has_project_access(project_id)));


create policy "Project members can view transactions"
on "public"."stripe_transactions"
as permissive
for select
to authenticated
using (has_project_access(project_id));


create policy "Service role full access to transactions"
on "public"."stripe_transactions"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Users can view their own profile"
on "public"."users"
as permissive
for select
to authenticated
using ((id = auth.uid()));


create policy "Members can view api keys"
on "public"."api_keys"
as permissive
for select
to authenticated
using (has_project_access(project_id));


create policy "Owners can manage api keys"
on "public"."api_keys"
as permissive
for all
to authenticated
using (is_project_owner(project_id))
with check (is_project_owner(project_id));


create policy "Members can view entitlements"
on "public"."entitlements"
as permissive
for select
to authenticated
using (has_project_access(project_id));


create policy "Members can view team"
on "public"."project_members"
as permissive
for select
to authenticated
using (((user_id = auth.uid()) OR is_project_owner(project_id)));


create policy "Owners can manage team"
on "public"."project_members"
as permissive
for all
to authenticated
using (is_project_owner(project_id))
with check (is_project_owner(project_id));


create policy "Owners can delete projects"
on "public"."projects"
as permissive
for delete
to authenticated
using (((deleted_at IS NULL) AND (owner_id = auth.uid())));


create policy "Owners can update projects"
on "public"."projects"
as permissive
for update
to authenticated
using (((deleted_at IS NULL) AND (owner_id = auth.uid())))
with check (((deleted_at IS NULL) AND (owner_id = auth.uid())));


create policy "Users can view their projects"
on "public"."projects"
as permissive
for select
to authenticated
using (((deleted_at IS NULL) AND ((owner_id = auth.uid()) OR is_project_member(id))));


create policy "Members can view subscriptions"
on "public"."stripe_subscriptions"
as permissive
for select
to authenticated
using (((deleted_at IS NULL) AND has_project_access(project_id)));


create policy "Members can view usage"
on "public"."usage"
as permissive
for select
to authenticated
using (has_project_access(project_id));


create policy "Members can view logs"
on "public"."validation_logs"
as permissive
for select
to authenticated
using (has_project_access(project_id));


CREATE TRIGGER trg_generate_initial_api_keys AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION generate_initial_api_keys();

CREATE TRIGGER trg_handle_project_soft_delete BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION handle_project_soft_delete();

CREATE TRIGGER trg_refresh_on_entitlement_change AFTER INSERT OR DELETE OR UPDATE ON public.entitlements FOR EACH ROW EXECUTE FUNCTION refresh_entitlement_summary();

CREATE TRIGGER trg_refresh_on_project_change AFTER INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION refresh_entitlement_summary();

CREATE TRIGGER trg_refresh_on_subscription_change AFTER INSERT OR DELETE OR UPDATE ON public.stripe_subscriptions FOR EACH ROW EXECUTE FUNCTION refresh_entitlement_summary();



