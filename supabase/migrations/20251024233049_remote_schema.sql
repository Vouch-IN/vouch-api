drop trigger if exists "trg_refresh_entitlement_summary" on "public"."entitlements";

drop trigger if exists "trg_refresh_on_entitlement_change" on "public"."entitlements";

drop trigger if exists "set_updated_at_organization_members" on "public"."organization_members";

drop trigger if exists "set_updated_at_organizations" on "public"."organizations";

drop trigger if exists "trg_add_owner_to_org_members" on "public"."organizations";

drop trigger if exists "trg_refresh_on_org_change" on "public"."organizations";

drop trigger if exists "sync_subscription_on_project_change" on "public"."projects";

drop trigger if exists "trg_refresh_on_subscription_change" on "public"."stripe_subscriptions";

drop policy "Admins can view entitlements" on "public"."entitlements";

drop policy "Members can view entitlements" on "public"."entitlements";

drop policy "Admins can add members" on "public"."organization_members";

drop policy "Admins can remove members" on "public"."organization_members";

drop policy "Admins can update member roles" on "public"."organization_members";

drop policy "Members can leave organization" on "public"."organization_members";

drop policy "Members can view org members" on "public"."organization_members";

drop policy "Superadmins full access to org members" on "public"."organization_members";

drop policy "Members can view their organizations" on "public"."organizations";

drop policy "Owners can delete organizations" on "public"."organizations";

drop policy "Owners can update their organizations" on "public"."organizations";

drop policy "Superadmins full access to organizations" on "public"."organizations";

drop policy "Users can create organizations" on "public"."organizations";

drop policy "Superadmins full access to stripe customers" on "public"."stripe_customers";

drop policy "Admins can view subscriptions" on "public"."stripe_subscriptions";

drop policy "Members can view subscriptions" on "public"."stripe_subscriptions";

drop policy "Admins can view transactions" on "public"."stripe_transactions";

drop policy "Org members can view other members" on "public"."users";

revoke delete on table "public"."stripe_prices" from "anon";

revoke insert on table "public"."stripe_prices" from "anon";

revoke references on table "public"."stripe_prices" from "anon";

revoke select on table "public"."stripe_prices" from "anon";

revoke trigger on table "public"."stripe_prices" from "anon";

revoke truncate on table "public"."stripe_prices" from "anon";

revoke update on table "public"."stripe_prices" from "anon";

revoke delete on table "public"."stripe_prices" from "authenticated";

revoke insert on table "public"."stripe_prices" from "authenticated";

revoke references on table "public"."stripe_prices" from "authenticated";

revoke select on table "public"."stripe_prices" from "authenticated";

revoke trigger on table "public"."stripe_prices" from "authenticated";

revoke truncate on table "public"."stripe_prices" from "authenticated";

revoke update on table "public"."stripe_prices" from "authenticated";

revoke delete on table "public"."stripe_prices" from "service_role";

revoke insert on table "public"."stripe_prices" from "service_role";

revoke references on table "public"."stripe_prices" from "service_role";

revoke select on table "public"."stripe_prices" from "service_role";

revoke trigger on table "public"."stripe_prices" from "service_role";

revoke truncate on table "public"."stripe_prices" from "service_role";

revoke update on table "public"."stripe_prices" from "service_role";

revoke delete on table "public"."stripe_products" from "anon";

revoke insert on table "public"."stripe_products" from "anon";

revoke references on table "public"."stripe_products" from "anon";

revoke select on table "public"."stripe_products" from "anon";

revoke trigger on table "public"."stripe_products" from "anon";

revoke truncate on table "public"."stripe_products" from "anon";

revoke update on table "public"."stripe_products" from "anon";

revoke delete on table "public"."stripe_products" from "authenticated";

revoke insert on table "public"."stripe_products" from "authenticated";

revoke references on table "public"."stripe_products" from "authenticated";

revoke select on table "public"."stripe_products" from "authenticated";

revoke trigger on table "public"."stripe_products" from "authenticated";

revoke truncate on table "public"."stripe_products" from "authenticated";

revoke update on table "public"."stripe_products" from "authenticated";

revoke delete on table "public"."stripe_products" from "service_role";

revoke insert on table "public"."stripe_products" from "service_role";

revoke references on table "public"."stripe_products" from "service_role";

revoke select on table "public"."stripe_products" from "service_role";

revoke trigger on table "public"."stripe_products" from "service_role";

revoke truncate on table "public"."stripe_products" from "service_role";

revoke update on table "public"."stripe_products" from "service_role";

alter table "public"."entitlements" drop constraint "entitlements_org_source_unique";

alter table "public"."entitlements" drop constraint "entitlements_organization_id_fkey";

alter table "public"."organization_members" drop constraint "organization_members_organization_id_fkey";

alter table "public"."organization_members" drop constraint "organization_members_role_check";

alter table "public"."organization_members" drop constraint "organization_members_user_id_fkey";

alter table "public"."organizations" drop constraint "organizations_id_check";

alter table "public"."organizations" drop constraint "organizations_owner_id_fkey";

alter table "public"."projects" drop constraint "projects_organization_id_fkey";

alter table "public"."projects" drop constraint "projects_organization_id_id_key";

alter table "public"."stripe_subscriptions" drop constraint "stripe_subscriptions_organization_id_fkey";

alter table "public"."stripe_transactions" drop constraint "stripe_transactions_organization_id_fkey";

drop index if exists "public"."idx_active_entitlement_summary_expiring";

drop index if exists "public"."idx_active_entitlement_summary_org";

drop materialized view if exists "public"."active_entitlement_summary";

drop function if exists "public"."add_owner_to_org_members"();

drop function if exists "public"."delete_organization_cascade"(org_id_param text);

drop function if exists "public"."delete_project_cascade"(project_id_param uuid);

drop function if exists "public"."is_org_admin"(org_id text);

drop function if exists "public"."is_org_member"(org_id text);

drop function if exists "public"."is_org_owner"(org_id text);

drop function if exists "public"."refresh_entitlement_summary"();

drop function if exists "public"."sync_subscription_quantity"();

drop function if exists "public"."user_organizations"();

alter table "public"."organization_members" drop constraint "organization_members_pkey";

alter table "public"."organizations" drop constraint "organizations_pkey";

drop index if exists "public"."entitlements_org_source_unique";

drop index if exists "public"."idx_entitlements_active_null";

drop index if exists "public"."idx_entitlements_org";

drop index if exists "public"."idx_entitlements_with_expiry";

drop index if exists "public"."idx_org_members_org_role";

drop index if exists "public"."idx_organizations_created";

drop index if exists "public"."idx_organizations_owner";

drop index if exists "public"."idx_projects_org";

drop index if exists "public"."idx_projects_org_active";

drop index if exists "public"."idx_subscriptions_active";

drop index if exists "public"."idx_subscriptions_org";

drop index if exists "public"."organization_members_pkey";

drop index if exists "public"."organizations_pkey";

drop index if exists "public"."projects_organization_id_id_key";

drop index if exists "public"."idx_org_members_user";

drop table "public"."organization_members";

drop table "public"."organizations";

create table "public"."project_members" (
    "user_id" uuid not null,
    "role" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "project_id" text not null
);


alter table "public"."project_members" enable row level security;

alter table "public"."entitlements" drop column "organization_id";

alter table "public"."entitlements" add column "project_id" text;

alter table "public"."projects" drop column "organization_id";

alter table "public"."projects" add column "billing_email" text;

alter table "public"."projects" add column "owner_id" uuid not null;

alter table "public"."stripe_subscriptions" drop column "organization_id";

alter table "public"."stripe_subscriptions" drop column "quantity";

alter table "public"."stripe_subscriptions" add column "project_id" text;

CREATE INDEX idx_entitlements_project ON public.entitlements USING btree (project_id);

CREATE INDEX idx_project_members_project ON public.project_members USING btree (project_id);

CREATE INDEX idx_project_members_user ON public.project_members USING btree (user_id);

CREATE INDEX idx_projects_owner ON public.projects USING btree (owner_id);

CREATE INDEX idx_subscriptions_project ON public.stripe_subscriptions USING btree (project_id);

CREATE INDEX idx_org_members_user ON public.project_members USING btree (user_id);

alter table "public"."entitlements" add constraint "entitlements_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."entitlements" validate constraint "entitlements_project_id_fkey";

alter table "public"."project_members" add constraint "organization_members_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text]))) not valid;

alter table "public"."project_members" validate constraint "organization_members_role_check";

alter table "public"."project_members" add constraint "organization_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."project_members" validate constraint "organization_members_user_id_fkey";

alter table "public"."project_members" add constraint "project_members_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."project_members" validate constraint "project_members_project_id_fkey";

alter table "public"."projects" add constraint "projects_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."projects" validate constraint "projects_owner_id_fkey";

alter table "public"."stripe_subscriptions" add constraint "stripe_subscriptions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."stripe_subscriptions" validate constraint "stripe_subscriptions_project_id_fkey";

set check_function_bodies = off;

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

create policy "Project members can view api keys"
on "public"."api_keys"
as permissive
for select
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM project_members
          WHERE ((project_members.project_id = projects.id) AND (project_members.user_id = auth.uid()))))))));


create policy "Project owners can manage api keys"
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


create policy "Superadmins full access to api keys"
on "public"."api_keys"
as permissive
for all
to authenticated
using (is_superadmin())
with check (is_superadmin());


create policy "Project members can view entitlements"
on "public"."entitlements"
as permissive
for select
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM project_members
          WHERE ((project_members.project_id = projects.id) AND (project_members.user_id = auth.uid()))))))));


create policy "Members can view team"
on "public"."project_members"
as permissive
for select
to authenticated
using (((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.owner_id = auth.uid()))) OR (user_id = auth.uid())));


create policy "Owners can manage team"
on "public"."project_members"
as permissive
for all
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.owner_id = auth.uid()))))
with check ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.owner_id = auth.uid()))));


create policy "Superadmins full access to org members"
on "public"."project_members"
as permissive
for all
to authenticated
using (is_superadmin())
with check (is_superadmin());


create policy "Owners can delete their projects"
on "public"."projects"
as permissive
for delete
to authenticated
using ((owner_id = auth.uid()));


create policy "Owners can update their projects"
on "public"."projects"
as permissive
for update
to authenticated
using ((owner_id = auth.uid()))
with check ((owner_id = auth.uid()));


create policy "Service role can manage everything"
on "public"."projects"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Superadmins full access to projects"
on "public"."projects"
as permissive
for all
to authenticated
using (is_superadmin())
with check (is_superadmin());


create policy "Users can create projects"
on "public"."projects"
as permissive
for insert
to authenticated
with check ((owner_id = auth.uid()));


create policy "Users can view their projects"
on "public"."projects"
as permissive
for select
to authenticated
using (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM project_members
  WHERE ((project_members.project_id = projects.id) AND (project_members.user_id = auth.uid()))))));


create policy "Project members can view subscriptions"
on "public"."stripe_subscriptions"
as permissive
for select
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM project_members
          WHERE ((project_members.project_id = projects.id) AND (project_members.user_id = auth.uid()))))))));


create policy "Project members can view usage"
on "public"."usage"
as permissive
for select
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM project_members
          WHERE ((project_members.project_id = projects.id) AND (project_members.user_id = auth.uid()))))))));


create policy "Superadmins full access to usage"
on "public"."usage"
as permissive
for all
to authenticated
using (is_superadmin())
with check (is_superadmin());


create policy "Project members can view validation logs"
on "public"."validation_logs"
as permissive
for select
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM project_members
          WHERE ((project_members.project_id = projects.id) AND (project_members.user_id = auth.uid()))))))));


create policy "Superadmins full access to validation logs"
on "public"."validation_logs"
as permissive
for all
to authenticated
using (is_superadmin())
with check (is_superadmin());


CREATE TRIGGER set_updated_at_organization_members BEFORE UPDATE ON public.project_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();



