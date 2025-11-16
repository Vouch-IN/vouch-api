drop trigger if exists "Sync API Keys to Worker" on "public"."api_keys";

drop trigger if exists "set_updated_at_entitlements" on "public"."entitlements";

drop trigger if exists "trg_refresh_on_entitlement_change" on "public"."entitlements";

drop trigger if exists "set_updated_at_project_members" on "public"."project_members";

drop trigger if exists "Sync Projects to Worker" on "public"."projects";

drop trigger if exists "set_updated_at_projects" on "public"."projects";

drop trigger if exists "trg_add_project_owner_as_admin" on "public"."projects";

drop trigger if exists "trg_generate_initial_api_keys" on "public"."projects";

drop trigger if exists "trg_handle_project_soft_delete" on "public"."projects";

drop trigger if exists "trg_refresh_on_project_change" on "public"."projects";

drop trigger if exists "set_updated_at_stripe_prices" on "public"."stripe_prices";

drop trigger if exists "set_updated_at_stripe_products" on "public"."stripe_products";

drop trigger if exists "Sync Subscriptions to Worker" on "public"."stripe_subscriptions";

drop trigger if exists "set_updated_at_stripe_subscriptions" on "public"."stripe_subscriptions";

drop trigger if exists "trg_refresh_on_subscription_change" on "public"."stripe_subscriptions";

drop trigger if exists "set_updated_at_usage" on "public"."usage";

drop trigger if exists "set_updated_at_users" on "public"."users";

drop policy "Authenticated users can create api keys" on "public"."api_keys";

drop policy "Authenticated users can delete api keys" on "public"."api_keys";

drop policy "Authenticated users can update api keys" on "public"."api_keys";

drop policy "Authenticated users can view api keys" on "public"."api_keys";

drop policy "Superadmins can view sync logs" on "public"."disposable_domain_sync_log";

drop policy "Authenticated users can view entitlements" on "public"."entitlements";

drop policy "Superadmins can delete entitlements" on "public"."entitlements";

drop policy "Superadmins can insert entitlements" on "public"."entitlements";

drop policy "Superadmins can update entitlements" on "public"."entitlements";

drop policy "Authenticated users can add project members" on "public"."project_members";

drop policy "Authenticated users can remove project members" on "public"."project_members";

drop policy "Authenticated users can update project members" on "public"."project_members";

drop policy "Authenticated users can view project members" on "public"."project_members";

drop policy "Authenticated users can create projects" on "public"."projects";

drop policy "Authenticated users can delete projects" on "public"."projects";

drop policy "Authenticated users can update projects" on "public"."projects";

drop policy "Authenticated users can view projects" on "public"."projects";

drop policy "Authenticated users can view subscriptions" on "public"."stripe_subscriptions";

drop policy "Authenticated users can view usage" on "public"."usage";

drop policy "Authenticated users can update users" on "public"."users";

drop policy "Authenticated users can view users" on "public"."users";

drop policy "Authenticated users can view validation logs" on "public"."validation_logs";

alter table "public"."api_keys" drop constraint "api_keys_project_id_fkey";

alter table "public"."entitlements" drop constraint "entitlements_project_id_fkey";

alter table "public"."project_members" drop constraint "project_members_project_id_fkey";

alter table "public"."project_members" drop constraint "project_members_user_id_fkey";

alter table "public"."stripe_prices" drop constraint "stripe_prices_product_id_fkey";

alter table "public"."stripe_subscriptions" drop constraint "stripe_subscriptions_entitlement_id_fkey";

alter table "public"."stripe_subscriptions" drop constraint "stripe_subscriptions_price_id_fkey";

alter table "public"."stripe_subscriptions" drop constraint "stripe_subscriptions_project_id_fkey";

alter table "public"."usage" drop constraint "usage_project_id_fkey";

alter table "public"."validation_logs" drop constraint "validation_logs_project_id_fkey";

drop materialized view if exists "public"."active_entitlements";

drop materialized view if exists "public"."validation_logs_daily";

alter table "public"."entitlements" alter column "team_limit" set default 1;

alter table "public"."api_keys" add constraint "api_keys_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."api_keys" validate constraint "api_keys_project_id_fkey";

alter table "public"."entitlements" add constraint "entitlements_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."entitlements" validate constraint "entitlements_project_id_fkey";

alter table "public"."project_members" add constraint "project_members_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."project_members" validate constraint "project_members_project_id_fkey";

alter table "public"."project_members" add constraint "project_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."project_members" validate constraint "project_members_user_id_fkey";

alter table "public"."stripe_prices" add constraint "stripe_prices_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.stripe_products(id) ON DELETE RESTRICT not valid;

alter table "public"."stripe_prices" validate constraint "stripe_prices_product_id_fkey";

alter table "public"."stripe_subscriptions" add constraint "stripe_subscriptions_entitlement_id_fkey" FOREIGN KEY (entitlement_id) REFERENCES public.entitlements(id) ON DELETE SET NULL not valid;

alter table "public"."stripe_subscriptions" validate constraint "stripe_subscriptions_entitlement_id_fkey";

alter table "public"."stripe_subscriptions" add constraint "stripe_subscriptions_price_id_fkey" FOREIGN KEY (price_id) REFERENCES public.stripe_prices(id) ON DELETE RESTRICT not valid;

alter table "public"."stripe_subscriptions" validate constraint "stripe_subscriptions_price_id_fkey";

alter table "public"."stripe_subscriptions" add constraint "stripe_subscriptions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."stripe_subscriptions" validate constraint "stripe_subscriptions_project_id_fkey";

alter table "public"."usage" add constraint "usage_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."usage" validate constraint "usage_project_id_fkey";

alter table "public"."validation_logs" add constraint "validation_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."validation_logs" validate constraint "validation_logs_project_id_fkey";

set check_function_bodies = off;

create materialized view "public"."active_entitlements" as  SELECT p.id AS project_id,
    p.slug AS project_slug,
    p.name AS project_name,
    p.owner_id,
    COALESCE(max(e.validations_limit), 1000) AS validations_limit,
    COALESCE(max(e.team_limit), 1) AS team_limit,
    COALESCE(max(e.log_retention_days), 7) AS log_retention_days,
    COALESCE(( SELECT array_agg(DISTINCT sub.elem) AS array_agg
           FROM ( SELECT unnest(e2.features) AS elem
                   FROM public.entitlements e2
                  WHERE ((e2.project_id = p.id) AND ((e2.ends_at IS NULL) OR (e2.ends_at > now())) AND (array_length(e2.features, 1) > 0))) sub), ARRAY[]::text[]) AS features,
    min(e.starts_at) AS first_entitlement_start,
        CASE
            WHEN bool_or((e.ends_at IS NULL)) THEN NULL::timestamp with time zone
            ELSE max(e.ends_at)
        END AS latest_entitlement_end,
    COALESCE(bool_or(((e.ends_at IS NULL) OR (e.ends_at > now()))), true) AS is_active,
    COALESCE(array_agg(DISTINCT e.source) FILTER (WHERE (e.source IS NOT NULL)), ARRAY['free'::text]) AS sources,
    ( SELECT json_build_object('id', s.id, 'product_name', s.product_name, 'amount', s.amount, 'currency', s.currency, 'interval', s."interval", 'status', s.status, 'current_period_start', s.current_period_start, 'current_period_end', s.current_period_end, 'cancel_at', s.cancel_at, 'cancel_at_period_end', s.cancel_at_period_end, 'canceled_at', s.canceled_at, 'trial_end', s.trial_end) AS json_build_object
           FROM public.stripe_subscriptions s
          WHERE ((s.project_id = p.id) AND (s.deleted_at IS NULL))
          ORDER BY s.created_at DESC
         LIMIT 1) AS subscription_info,
    now() AS last_refreshed
   FROM (public.projects p
     LEFT JOIN public.entitlements e ON (((e.project_id = p.id) AND ((e.ends_at IS NULL) OR (e.ends_at > now())))))
  WHERE (p.deleted_at IS NULL)
  GROUP BY p.id, p.slug, p.name, p.owner_id;


CREATE OR REPLACE FUNCTION public.handle_project_soft_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Rename slug to deleted-{old_slug}-{timestamp}
    -- Use hyphens instead of underscores to comply with slug_format constraint
    NEW.slug = 'deleted-' || OLD.slug || '-' || to_char(NOW(), 'YYYYMMDDHH24MISS');
  END IF;
  RETURN NEW;
END;
$function$
;

create materialized view "public"."validation_logs_daily" as  SELECT project_id,
    date((created_at AT TIME ZONE 'UTC'::text)) AS date,
    count(*) AS count,
    count(*) FILTER (WHERE (recommendation = 'allow'::text)) AS approved,
    count(*) FILTER (WHERE (recommendation = 'block'::text)) AS rejected,
    count(*) FILTER (WHERE (recommendation = 'flag'::text)) AS failed,
    (avg(risk_score))::integer AS avg_risk_score,
    (avg(latency_ms))::integer AS avg_latency_ms,
    min(created_at) AS first_validation,
    max(created_at) AS last_validation,
    now() AS last_refreshed
   FROM public.validation_logs vl
  WHERE (created_at >= (CURRENT_DATE - '90 days'::interval))
  GROUP BY project_id, (date((created_at AT TIME ZONE 'UTC'::text)));



  create policy "Authenticated users can create api keys"
  on "public"."api_keys"
  as permissive
  for insert
  to authenticated
with check ((public.can_manage_project(project_id) OR public.is_superadmin()));



  create policy "Authenticated users can delete api keys"
  on "public"."api_keys"
  as permissive
  for delete
  to authenticated
using ((public.can_manage_project(project_id) OR public.is_superadmin()));



  create policy "Authenticated users can update api keys"
  on "public"."api_keys"
  as permissive
  for update
  to authenticated
using ((public.can_manage_project(project_id) OR public.is_superadmin()))
with check ((public.can_manage_project(project_id) OR public.is_superadmin()));



  create policy "Authenticated users can view api keys"
  on "public"."api_keys"
  as permissive
  for select
  to authenticated
using ((public.has_project_access(project_id) OR public.is_superadmin()));



  create policy "Superadmins can view sync logs"
  on "public"."disposable_domain_sync_log"
  as permissive
  for select
  to authenticated
using (public.is_superadmin());



  create policy "Authenticated users can view entitlements"
  on "public"."entitlements"
  as permissive
  for select
  to authenticated
using ((public.has_project_access(project_id) OR public.is_superadmin()));



  create policy "Superadmins can delete entitlements"
  on "public"."entitlements"
  as permissive
  for delete
  to authenticated
using (public.is_superadmin());



  create policy "Superadmins can insert entitlements"
  on "public"."entitlements"
  as permissive
  for insert
  to authenticated
with check (public.is_superadmin());



  create policy "Superadmins can update entitlements"
  on "public"."entitlements"
  as permissive
  for update
  to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());



  create policy "Authenticated users can add project members"
  on "public"."project_members"
  as permissive
  for insert
  to authenticated
with check ((public.can_manage_project(project_id) OR public.is_superadmin()));



  create policy "Authenticated users can remove project members"
  on "public"."project_members"
  as permissive
  for delete
  to authenticated
using ((public.can_manage_project(project_id) OR public.is_superadmin()));



  create policy "Authenticated users can update project members"
  on "public"."project_members"
  as permissive
  for update
  to authenticated
using ((public.can_manage_project(project_id) OR public.is_superadmin()))
with check ((public.can_manage_project(project_id) OR public.is_superadmin()));



  create policy "Authenticated users can view project members"
  on "public"."project_members"
  as permissive
  for select
  to authenticated
using ((public.has_project_access(project_id) OR public.is_superadmin()));



  create policy "Authenticated users can create projects"
  on "public"."projects"
  as permissive
  for insert
  to authenticated
with check (((owner_id = ( SELECT auth.uid() AS uid)) OR public.is_superadmin()));



  create policy "Authenticated users can delete projects"
  on "public"."projects"
  as permissive
  for delete
  to authenticated
using ((((owner_id = ( SELECT auth.uid() AS uid)) AND (deleted_at IS NULL)) OR public.is_superadmin()));



  create policy "Authenticated users can update projects"
  on "public"."projects"
  as permissive
  for update
  to authenticated
using ((public.can_manage_project(id) OR public.is_superadmin()))
with check ((public.can_manage_project(id) OR public.is_superadmin()));



  create policy "Authenticated users can view projects"
  on "public"."projects"
  as permissive
  for select
  to authenticated
using (((owner_id = ( SELECT auth.uid() AS uid)) OR public.has_project_access(id) OR public.is_superadmin()));



  create policy "Authenticated users can view subscriptions"
  on "public"."stripe_subscriptions"
  as permissive
  for select
  to authenticated
using ((public.has_project_access(project_id) OR public.is_superadmin()));



  create policy "Authenticated users can view usage"
  on "public"."usage"
  as permissive
  for select
  to authenticated
using ((public.has_project_access(project_id) OR public.is_superadmin()));



  create policy "Authenticated users can update users"
  on "public"."users"
  as permissive
  for update
  to authenticated
using (((id = ( SELECT auth.uid() AS uid)) OR public.is_superadmin()))
with check ((((id = ( SELECT auth.uid() AS uid)) AND (is_superadmin = ( SELECT users_1.is_superadmin
   FROM public.users users_1
  WHERE (users_1.id = ( SELECT auth.uid() AS uid))))) OR public.is_superadmin()));



  create policy "Authenticated users can view users"
  on "public"."users"
  as permissive
  for select
  to authenticated
using (((id = ( SELECT auth.uid() AS uid)) OR public.is_superadmin()));



  create policy "Authenticated users can view validation logs"
  on "public"."validation_logs"
  as permissive
  for select
  to authenticated
using ((public.has_project_access(project_id) OR public.is_superadmin()));


CREATE TRIGGER "Sync API Keys to Worker" AFTER INSERT OR DELETE OR UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.sync_to_worker();

CREATE TRIGGER set_updated_at_entitlements BEFORE UPDATE ON public.entitlements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_refresh_on_entitlement_change AFTER INSERT OR DELETE OR UPDATE ON public.entitlements FOR EACH ROW EXECUTE FUNCTION public.refresh_entitlement_summary();

CREATE TRIGGER set_updated_at_project_members BEFORE UPDATE ON public.project_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER "Sync Projects to Worker" AFTER INSERT OR DELETE OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.sync_to_worker();

CREATE TRIGGER set_updated_at_projects BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_add_project_owner_as_admin AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.add_project_owner_as_admin();

CREATE TRIGGER trg_generate_initial_api_keys AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.generate_initial_api_keys();

CREATE TRIGGER trg_handle_project_soft_delete BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.handle_project_soft_delete();

CREATE TRIGGER trg_refresh_on_project_change AFTER INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.refresh_entitlement_summary();

CREATE TRIGGER set_updated_at_stripe_prices BEFORE UPDATE ON public.stripe_prices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_stripe_products BEFORE UPDATE ON public.stripe_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER "Sync Subscriptions to Worker" AFTER INSERT OR DELETE OR UPDATE ON public.stripe_subscriptions FOR EACH ROW EXECUTE FUNCTION public.sync_to_worker();

CREATE TRIGGER set_updated_at_stripe_subscriptions BEFORE UPDATE ON public.stripe_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_refresh_on_subscription_change AFTER INSERT OR DELETE OR UPDATE ON public.stripe_subscriptions FOR EACH ROW EXECUTE FUNCTION public.refresh_entitlement_summary();

CREATE TRIGGER set_updated_at_usage BEFORE UPDATE ON public.usage FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

drop trigger if exists "trg_sync_auth_users_to_public" on "auth"."users";

CREATE TRIGGER trg_sync_auth_users_to_public AFTER INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_public();


