drop policy "Project members can view api keys" on "public"."api_keys";

drop policy "Project owners can manage api keys" on "public"."api_keys";

drop policy "Superadmins full access to api keys" on "public"."api_keys";

drop policy "Project members can view entitlements" on "public"."entitlements";

drop policy "Service role can manage entitlements" on "public"."entitlements";

drop policy "Superadmins full access to entitlements" on "public"."entitlements";

drop policy "Superadmins full access to org members" on "public"."project_members";

drop policy "Owners can delete their projects" on "public"."projects";

drop policy "Owners can update their projects" on "public"."projects";

drop policy "Service role can manage everything" on "public"."projects";

drop policy "Superadmins full access to projects" on "public"."projects";

drop policy "Service role can manage customers" on "public"."stripe_customers";

drop policy "Users can view their own customer" on "public"."stripe_customers";

drop policy "Service role can manage payment methods" on "public"."stripe_payment_methods";

drop policy "Superadmins full access to payment methods" on "public"."stripe_payment_methods";

drop policy "Users can view their payment methods" on "public"."stripe_payment_methods";

drop policy "Anyone can view prices" on "public"."stripe_prices";

drop policy "Service role can manage prices" on "public"."stripe_prices";

drop policy "Anyone can view products" on "public"."stripe_products";

drop policy "Service role can manage products" on "public"."stripe_products";

drop policy "Project members can view subscriptions" on "public"."stripe_subscriptions";

drop policy "Service role can manage subscriptions" on "public"."stripe_subscriptions";

drop policy "Superadmins full access to subscriptions" on "public"."stripe_subscriptions";

drop policy "Service role can manage transactions" on "public"."stripe_transactions";

drop policy "Superadmins full access to transactions" on "public"."stripe_transactions";

drop policy "Project members can view usage" on "public"."usage";

drop policy "Service role can manage usage" on "public"."usage";

drop policy "Superadmins full access to usage" on "public"."usage";

drop policy "Superadmins can update any user" on "public"."users";

drop policy "Superadmins can view all users" on "public"."users";

drop policy "Users can update own profile" on "public"."users";

drop policy "Users can view own profile" on "public"."users";

drop policy "Project members can view validation logs" on "public"."validation_logs";

drop policy "Service role can manage validation logs" on "public"."validation_logs";

drop policy "Superadmins full access to validation logs" on "public"."validation_logs";

revoke delete on table "public"."project_members" from "anon";

revoke insert on table "public"."project_members" from "anon";

revoke references on table "public"."project_members" from "anon";

revoke select on table "public"."project_members" from "anon";

revoke trigger on table "public"."project_members" from "anon";

revoke truncate on table "public"."project_members" from "anon";

revoke update on table "public"."project_members" from "anon";

revoke delete on table "public"."project_members" from "authenticated";

revoke insert on table "public"."project_members" from "authenticated";

revoke references on table "public"."project_members" from "authenticated";

revoke select on table "public"."project_members" from "authenticated";

revoke trigger on table "public"."project_members" from "authenticated";

revoke truncate on table "public"."project_members" from "authenticated";

revoke update on table "public"."project_members" from "authenticated";

revoke delete on table "public"."project_members" from "service_role";

revoke insert on table "public"."project_members" from "service_role";

revoke references on table "public"."project_members" from "service_role";

revoke select on table "public"."project_members" from "service_role";

revoke trigger on table "public"."project_members" from "service_role";

revoke truncate on table "public"."project_members" from "service_role";

revoke update on table "public"."project_members" from "service_role";

CREATE INDEX idx_projects_deleted ON public.projects USING btree (deleted_at) WHERE (deleted_at IS NULL);

set check_function_bodies = off;

create materialized view "public"."active_entitlements" as  SELECT p.id AS project_id,
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
          WHERE ((s.project_id = p.id) AND (s.status = ANY (ARRAY['active'::text, 'trialing'::text])))
          ORDER BY s.current_period_end DESC
         LIMIT 1) AS subscription_info,
    now() AS last_refreshed
   FROM (projects p
     LEFT JOIN entitlements e ON (((e.project_id = p.id) AND ((e.ends_at IS NULL) OR (e.ends_at > now())))))
  WHERE (p.deleted_at IS NULL)
  GROUP BY p.id, p.name, p.owner_id;


CREATE OR REPLACE FUNCTION public.delete_project_cascade(project_id_param text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  subscription_ids TEXT[];
  result JSONB;
BEGIN
  -- Get subscription IDs to cancel in Stripe
  SELECT ARRAY_AGG(id)
  INTO subscription_ids
  FROM stripe_subscriptions
  WHERE project_id = project_id_param
  AND status IN ('active', 'trialing', 'past_due')
  AND deleted_at IS NULL;

  -- Hard delete API keys (security)
  DELETE FROM api_keys WHERE project_id = project_id_param;

  -- Soft delete subscriptions (keep for history)
  UPDATE stripe_subscriptions
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE project_id = project_id_param;

  -- Hard delete entitlements (no longer valid)
  DELETE FROM entitlements WHERE project_id = project_id_param;

  -- Hard delete project members (junction table)
  DELETE FROM project_members WHERE project_id = project_id_param;

  -- Soft delete project
  UPDATE projects
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = project_id_param;

  -- Return subscription IDs to cancel in Stripe
  result := jsonb_build_object(
    'success', TRUE,
    'subscription_ids', COALESCE(subscription_ids, ARRAY[]::TEXT[])
  );

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_entitlement_summary()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_entitlements;
  RETURN NULL;
END;
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

CREATE INDEX idx_active_entitlements_expiring ON public.active_entitlements USING btree (latest_entitlement_end) WHERE (latest_entitlement_end IS NOT NULL);

CREATE INDEX idx_active_entitlements_owner ON public.active_entitlements USING btree (owner_id);

CREATE UNIQUE INDEX idx_active_entitlements_project ON public.active_entitlements USING btree (project_id);

create policy "Members can view api keys"
on "public"."api_keys"
as permissive
for select
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM project_members
          WHERE ((project_members.project_id = projects.id) AND (project_members.user_id = auth.uid()))))))));


create policy "Owners can manage api keys"
on "public"."api_keys"
as permissive
for all
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.owner_id = auth.uid()))))
with check ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.owner_id = auth.uid()))));


create policy "Superadmins full access api keys"
on "public"."api_keys"
as permissive
for all
to authenticated
using (is_superadmin())
with check (is_superadmin());


create policy "Members can view entitlements"
on "public"."entitlements"
as permissive
for select
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM project_members
          WHERE ((project_members.project_id = projects.id) AND (project_members.user_id = auth.uid()))))))));


create policy "Service role all entitlements"
on "public"."entitlements"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Superadmins full access entitlements"
on "public"."entitlements"
as permissive
for all
to authenticated
using (is_superadmin())
with check (is_superadmin());


create policy "Service role all members"
on "public"."project_members"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Superadmins full access members"
on "public"."project_members"
as permissive
for all
to authenticated
using (is_superadmin())
with check (is_superadmin());


create policy "Owners can delete projects"
on "public"."projects"
as permissive
for delete
to authenticated
using ((owner_id = auth.uid()));


create policy "Owners can update projects"
on "public"."projects"
as permissive
for update
to authenticated
using ((owner_id = auth.uid()))
with check ((owner_id = auth.uid()));


create policy "Service role all projects"
on "public"."projects"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Superadmins full access projects"
on "public"."projects"
as permissive
for all
to authenticated
using (is_superadmin())
with check (is_superadmin());


create policy "Members can view subscriptions"
on "public"."stripe_subscriptions"
as permissive
for select
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM project_members
          WHERE ((project_members.project_id = projects.id) AND (project_members.user_id = auth.uid()))))))));


create policy "Service role all subscriptions"
on "public"."stripe_subscriptions"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Superadmins full access subscriptions"
on "public"."stripe_subscriptions"
as permissive
for all
to authenticated
using (is_superadmin())
with check (is_superadmin());


create policy "Members can view usage"
on "public"."usage"
as permissive
for select
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM project_members
          WHERE ((project_members.project_id = projects.id) AND (project_members.user_id = auth.uid()))))))));


create policy "Superadmins full access usage"
on "public"."usage"
as permissive
for all
to authenticated
using (is_superadmin())
with check (is_superadmin());


create policy "Members can view logs"
on "public"."validation_logs"
as permissive
for select
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM project_members
          WHERE ((project_members.project_id = projects.id) AND (project_members.user_id = auth.uid()))))))));


create policy "Superadmins full access logs"
on "public"."validation_logs"
as permissive
for all
to authenticated
using (is_superadmin())
with check (is_superadmin());


CREATE TRIGGER trg_refresh_on_entitlement_change AFTER INSERT OR DELETE OR UPDATE ON public.entitlements FOR EACH STATEMENT EXECUTE FUNCTION refresh_entitlement_summary();

CREATE TRIGGER trg_refresh_on_project_change AFTER INSERT OR UPDATE ON public.projects FOR EACH STATEMENT EXECUTE FUNCTION refresh_entitlement_summary();

CREATE TRIGGER trg_refresh_on_subscription_change AFTER INSERT OR DELETE OR UPDATE ON public.stripe_subscriptions FOR EACH STATEMENT EXECUTE FUNCTION refresh_entitlement_summary();



