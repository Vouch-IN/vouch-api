


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."delete_old_logs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM validation_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;


ALTER FUNCTION "public"."delete_old_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_usage_for_project"("p_project_id" "text", "p_current_period_end" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Archive old usage
  INSERT INTO usage_archive (project_id, month, count, archived_at)
  SELECT project_id, month, count, NOW()
  FROM usage
  WHERE project_id = p_project_id;

  -- Delete current usage
  DELETE FROM usage WHERE project_id = p_project_id;
END;
$$;


ALTER FUNCTION "public"."reset_usage_for_project"("p_project_id" "text", "p_current_period_end" timestamp with time zone) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" "text" NOT NULL,
    "project_id" "text",
    "type" "text" NOT NULL,
    "environment" "text" NOT NULL,
    "key_hash" "text" NOT NULL,
    "name" "text",
    "allowed_domains" "text"[],
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "revoked_at" timestamp with time zone,
    CONSTRAINT "api_keys_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"]))),
    CONSTRAINT "api_keys_type_check" CHECK (("type" = ANY (ARRAY['client'::"text", 'server'::"text"])))
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."disposable_domain_sync_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "total_domains" integer NOT NULL,
    "domains_added" integer NOT NULL,
    "domains_removed" integer NOT NULL,
    "added_domains" "text"[],
    "removed_domains" "text"[],
    "sources" "text"[] NOT NULL,
    "success" boolean NOT NULL,
    "error_message" "text"
);


ALTER TABLE "public"."disposable_domain_sync_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "text" NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "valid_project_id" CHECK (("id" ~ '^proj_[a-z0-9]+$'::"text"))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "text" NOT NULL,
    "user_id" "uuid",
    "stripe_customer_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "price_id" "text" NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "entitlements" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "project_id" "text",
    "billing_cycle" "text",
    "days_until_due" integer,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    CONSTRAINT "subscriptions_billing_cycle_check" CHECK (("billing_cycle" = ANY (ARRAY['monthly'::"text", 'yearly'::"text", 'weekly'::"text", 'daily'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "text",
    "month" "text" NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "limit_exceeded_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stripe_customer_id" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."validation_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "text",
    "email_hash" "text" NOT NULL,
    "email_encrypted" "text" NOT NULL,
    "fingerprint_id" "text",
    "ip_address" "inet",
    "is_valid" boolean NOT NULL,
    "risk_score" integer NOT NULL,
    "recommendation" "text" NOT NULL,
    "signals" "text"[] DEFAULT '{}'::"text"[],
    "checks" "jsonb" NOT NULL,
    "latency_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "validation_logs_recommendation_check" CHECK (("recommendation" = ANY (ARRAY['allow'::"text", 'flag'::"text", 'block'::"text"])))
);


ALTER TABLE "public"."validation_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disposable_domain_sync_log"
    ADD CONSTRAINT "disposable_domain_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage"
    ADD CONSTRAINT "usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage"
    ADD CONSTRAINT "usage_project_id_month_key" UNIQUE ("project_id", "month");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."validation_logs"
    ADD CONSTRAINT "validation_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_api_keys_hash" ON "public"."api_keys" USING "btree" ("key_hash");



CREATE INDEX "idx_api_keys_project" ON "public"."api_keys" USING "btree" ("project_id");



CREATE INDEX "idx_projects_user_id" ON "public"."projects" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_customer" ON "public"."subscriptions" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_subscriptions_project" ON "public"."subscriptions" USING "btree" ("project_id");



CREATE INDEX "idx_subscriptions_user" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_sync_log_synced_at" ON "public"."disposable_domain_sync_log" USING "btree" ("synced_at" DESC);



CREATE INDEX "idx_usage_project_month" ON "public"."usage" USING "btree" ("project_id", "month");



CREATE INDEX "idx_validation_logs_created" ON "public"."validation_logs" USING "btree" ("created_at");



CREATE INDEX "idx_validation_logs_fingerprint" ON "public"."validation_logs" USING "btree" ("fingerprint_id");



CREATE INDEX "idx_validation_logs_project_created" ON "public"."validation_logs" USING "btree" ("project_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "Sync API Keys to Worker" AFTER INSERT OR DELETE OR UPDATE ON "public"."api_keys" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://api.vouch.expert/webhook', 'POST', '{"Content-Type":"application/json","x-webhook-token":"327d6f2a98a0b297eefad0fe40c21fd30e15447487a77fc1f63466bd5a90ef12"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "Sync Projects to Worker" AFTER INSERT OR DELETE OR UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://api.vouch.expert/webhook', 'POST', '{"Content-Type":"application/json","x-webhook-token":"327d6f2a98a0b297eefad0fe40c21fd30e15447487a77fc1f63466bd5a90ef12"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "Sync Subscriptions to Worker" AFTER INSERT OR DELETE OR UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://api.vouch.expert/webhook', 'POST', '{"Content-type":"application/json","x-webhook-token":"327d6f2a98a0b297eefad0fe40c21fd30e15447487a77fc1f63466bd5a90ef12"}', '{}', '5000');



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage"
    ADD CONSTRAINT "usage_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."validation_logs"
    ADD CONSTRAINT "validation_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



CREATE POLICY "Users can manage keys for own projects" ON "public"."api_keys" USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage own projects" ON "public"."projects" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view logs for own projects" ON "public"."validation_logs" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view subscriptions for own projects or own user_id" ON "public"."subscriptions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."validation_logs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."delete_old_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_old_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_old_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_usage_for_project"("p_project_id" "text", "p_current_period_end" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."reset_usage_for_project"("p_project_id" "text", "p_current_period_end" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_usage_for_project"("p_project_id" "text", "p_current_period_end" timestamp with time zone) TO "service_role";


















GRANT ALL ON TABLE "public"."api_keys" TO "anon";
GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."disposable_domain_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."disposable_domain_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."disposable_domain_sync_log" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."usage" TO "anon";
GRANT ALL ON TABLE "public"."usage" TO "authenticated";
GRANT ALL ON TABLE "public"."usage" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."validation_logs" TO "anon";
GRANT ALL ON TABLE "public"."validation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."validation_logs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;

