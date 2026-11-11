CREATE TABLE "merchant_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'trialing' NOT NULL,
	"current_period_ends_at" timestamp with time zone,
	"payment_verified_at" timestamp with time zone,
	"verification_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_subscriptions_merchant_id_unique" UNIQUE("merchant_id"),
	CONSTRAINT "subscription_status_valid" CHECK ("merchant_subscriptions"."status" IN ('trialing','active','past_due','canceled','expired')),
	CONSTRAINT "subscription_verification_source_valid" CHECK ("merchant_subscriptions"."verification_source" IS NULL OR "merchant_subscriptions"."verification_source" IN ('provider','admin')),
	CONSTRAINT "active_subscription_verified" CHECK ("merchant_subscriptions"."status" <> 'active' OR ("merchant_subscriptions"."payment_verified_at" IS NOT NULL AND "merchant_subscriptions"."verification_source" IS NOT NULL AND "merchant_subscriptions"."current_period_ends_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "merchant_trial_claims" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "trial_started_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "trial_ends_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP + interval '336 hours' NOT NULL;--> statement-breakpoint
UPDATE public.merchants SET trial_started_at = created_at, trial_ends_at = created_at + interval '336 hours';--> statement-breakpoint
ALTER TABLE "merchant_subscriptions" ADD CONSTRAINT "merchant_subscriptions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_subscriptions" ADD CONSTRAINT "merchant_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_trial_claims" ADD CONSTRAINT "merchant_trial_claims_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_events_merchant" ON "subscription_events" USING btree ("merchant_id","created_at");--> statement-breakpoint
INSERT INTO public.subscription_plans(id,name,description) VALUES ('servqo-standard','SERVQO Standard','Website builder and workspace. Payments and pricing are not connected.');
--> statement-breakpoint
INSERT INTO public.merchant_subscriptions(merchant_id,plan_id,status) SELECT id,'servqo-standard',CASE WHEN trial_ends_at > CURRENT_TIMESTAMP THEN 'trialing' ELSE 'expired' END FROM public.merchants;
--> statement-breakpoint
INSERT INTO public.subscription_events(merchant_id,kind,details) SELECT id,'legacy_trial_initialized',jsonb_build_object('source','original_merchant_creation','trial_ends_at',trial_ends_at) FROM public.merchants;
--> statement-breakpoint
INSERT INTO public.merchant_trial_claims(user_id,merchant_id) SELECT DISTINCT ON (u.user_id) u.user_id,u.merchant_id FROM public.merchant_users u JOIN public.merchants m ON m.id=u.merchant_id WHERE u.role='owner' ORDER BY u.user_id,m.created_at,m.id;
--> statement-breakpoint
CREATE FUNCTION public.initialize_merchant_trial() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 INSERT INTO public.merchant_subscriptions(merchant_id,plan_id,status) VALUES (NEW.id,'servqo-standard','trialing');
 INSERT INTO public.subscription_events(merchant_id,kind,details) VALUES (NEW.id,'trial_started',jsonb_build_object('trial_started_at',NEW.trial_started_at,'trial_ends_at',NEW.trial_ends_at));
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER initialize_merchant_trial AFTER INSERT ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.initialize_merchant_trial();
--> statement-breakpoint
CREATE FUNCTION public.preserve_merchant_trial() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN RAISE EXCEPTION 'Merchant trial dates cannot be changed'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER preserve_merchant_trial BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.preserve_merchant_trial();
--> statement-breakpoint
CREATE FUNCTION public.preserve_subscription_history() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Subscription history and trial claims are append-only'; END $$;
--> statement-breakpoint
CREATE TRIGGER preserve_subscription_events BEFORE UPDATE OR DELETE ON public.subscription_events FOR EACH ROW EXECUTE FUNCTION public.preserve_subscription_history();
--> statement-breakpoint
CREATE TRIGGER preserve_trial_claims BEFORE UPDATE OR DELETE ON public.merchant_trial_claims FOR EACH ROW EXECUTE FUNCTION public.preserve_subscription_history();
--> statement-breakpoint
CREATE FUNCTION public.audit_subscription_change() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF (NEW.status,NEW.plan_id,NEW.current_period_ends_at,NEW.payment_verified_at,NEW.verification_source) IS DISTINCT FROM (OLD.status,OLD.plan_id,OLD.current_period_ends_at,OLD.payment_verified_at,OLD.verification_source) THEN
 INSERT INTO public.subscription_events(merchant_id,kind,details) VALUES (NEW.merchant_id,'subscription_changed',jsonb_build_object('previous_status',OLD.status,'status',NEW.status,'plan_id',NEW.plan_id,'verification_source',NEW.verification_source));
 END IF;
 NEW.updated_at=CURRENT_TIMESTAMP;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_subscription_change BEFORE UPDATE ON public.merchant_subscriptions FOR EACH ROW EXECUTE FUNCTION public.audit_subscription_change();
--> statement-breakpoint
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['subscription_plans','merchant_subscriptions','subscription_events','merchant_trial_claims'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 END LOOP;
END $$;
--> statement-breakpoint
CREATE POLICY subscription_plan_read ON public.subscription_plans FOR SELECT TO authenticated USING (active);
--> statement-breakpoint
CREATE POLICY subscription_tenant_read ON public.merchant_subscriptions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.merchant_users u WHERE u.merchant_id=merchant_subscriptions.merchant_id AND u.user_id=auth.uid()));
--> statement-breakpoint
CREATE POLICY subscription_event_read ON public.subscription_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.merchant_users u WHERE u.merchant_id=subscription_events.merchant_id AND u.user_id=auth.uid()));
--> statement-breakpoint
CREATE POLICY trial_claim_self_read ON public.merchant_trial_claims FOR SELECT TO authenticated USING (user_id=auth.uid());
--> statement-breakpoint
CREATE FUNCTION public.merchant_has_subscription(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (SELECT 1 FROM public.merchants m JOIN public.merchant_subscriptions s ON s.merchant_id=m.id WHERE m.id=target AND EXISTS (SELECT 1 FROM public.merchant_users u WHERE u.merchant_id=m.id AND u.user_id=auth.uid()) AND ((m.trial_started_at<=CURRENT_TIMESTAMP AND m.trial_ends_at>CURRENT_TIMESTAMP) OR (s.status='active' AND s.verification_source IN ('provider','admin') AND s.payment_verified_at<=CURRENT_TIMESTAMP AND s.current_period_ends_at>CURRENT_TIMESTAMP)));
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.merchant_has_subscription(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.merchant_has_subscription(uuid) TO authenticated;
