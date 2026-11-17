CREATE TABLE "merchant_module_trials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"module_key" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_module_definitions" ADD COLUMN "access_policy" text DEFAULT 'paid' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_module_definitions" ADD COLUMN "trial_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "business_module_entitlements" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "merchant_module_trials" ADD CONSTRAINT "merchant_module_trials_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_module_trials" ADD CONSTRAINT "merchant_module_trials_module_key_business_module_definitions_key_fk" FOREIGN KEY ("module_key") REFERENCES "public"."business_module_definitions"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_module_trial_unique" ON "merchant_module_trials" USING btree ("merchant_id","module_key");
--> statement-breakpoint
ALTER TABLE public.business_module_definitions ADD CONSTRAINT module_access_policy_valid CHECK(access_policy IN ('free','paid'));
ALTER TABLE public.business_module_entitlements ADD CONSTRAINT module_verified_period_valid CHECK(verified_at IS NULL OR (source IN ('provider','admin') AND expires_at IS NOT NULL AND expires_at>verified_at));
UPDATE public.business_module_definitions SET access_policy='free',trial_eligible=false WHERE key IN ('overview','business','settings','website','media','catalog');
UPDATE public.business_module_definitions SET access_policy='paid',trial_eligible=true WHERE key IN ('pos','fnb_orders','kitchen_queue');
UPDATE public.merchant_modules SET enabled=true WHERE module_key IN ('overview','business','settings','website','media','catalog');
-- Included Core choices are now permanent, not optional paid selections.
UPDATE public.merchants SET onboarding_services=(SELECT coalesce(jsonb_agg(v),'[]'::jsonb) FROM jsonb_array_elements(onboarding_services) v WHERE v#>>'{}' NOT IN ('website','media','catalog')) WHERE onboarding_step<>'complete';
INSERT INTO public.merchant_module_trials(merchant_id,module_key,starts_at,ends_at)
 SELECT m.id,d.key,m.trial_started_at,m.trial_ends_at FROM public.merchants m CROSS JOIN public.business_module_definitions d WHERE d.key IN ('pos','fnb_orders','kitchen_queue') AND d.available AND d.trial_eligible ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE FUNCTION public.guard_module_trial() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Service trial authorization is immutable'; END IF;
 IF NEW.module_key NOT IN ('pos','fnb_orders','kitchen_queue') OR NOT EXISTS(
 SELECT 1 FROM public.merchants m JOIN public.business_module_definitions d ON d.key=NEW.module_key
 WHERE m.id=NEW.merchant_id AND d.available AND d.trial_eligible AND d.access_policy='paid'
 AND NEW.starts_at=m.trial_started_at AND NEW.ends_at=m.trial_ends_at AND NEW.ends_at>NEW.starts_at)
 THEN RAISE EXCEPTION 'Invalid service trial period'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_module_trial BEFORE INSERT OR UPDATE OR DELETE ON public.merchant_module_trials FOR EACH ROW EXECUTE FUNCTION public.guard_module_trial();
REVOKE ALL ON FUNCTION public.guard_module_trial() FROM PUBLIC;
ALTER TABLE public.merchant_module_trials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.merchant_module_trials FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.merchant_module_trials TO authenticated;
CREATE POLICY module_trial_read ON public.merchant_module_trials FOR SELECT TO authenticated USING(public.is_merchant_member(merchant_id));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.initialize_business_modules() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 INSERT INTO public.merchant_modules(merchant_id,module_key,enabled)
 SELECT NEW.id,key,access_policy='free' OR NEW.business_type IN ('cafe','bakery') FROM public.business_module_definitions WHERE available AND key IN ('overview','business','settings','website','media','catalog','pos','fnb_orders','kitchen_queue');
 INSERT INTO public.business_module_entitlements(merchant_id,module_key,source)
 SELECT NEW.id,key,'included' FROM public.business_module_definitions WHERE available AND access_policy='free';
 INSERT INTO public.merchant_module_trials(merchant_id,module_key,starts_at,ends_at)
 SELECT NEW.id,key,NEW.trial_started_at,NEW.trial_ends_at FROM public.business_module_definitions WHERE available AND trial_eligible AND key IN ('pos','fnb_orders','kitchen_queue');
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION public.company_module_readable(target uuid,module text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT module IN ('overview','business','settings','website','media','catalog','pos','fnb_orders','kitchen_queue') AND NOT EXISTS(
 SELECT required FROM unnest(CASE module WHEN 'media' THEN ARRAY['media','website'] WHEN 'pos' THEN ARRAY['pos','catalog'] WHEN 'fnb_orders' THEN ARRAY['fnb_orders','catalog'] WHEN 'kitchen_queue' THEN ARRAY['kitchen_queue','fnb_orders','catalog'] ELSE ARRAY[module] END) required
 WHERE NOT EXISTS(SELECT 1 FROM public.merchant_modules c JOIN public.business_module_definitions d ON d.key=c.module_key WHERE c.merchant_id=target AND c.module_key=required AND c.enabled AND d.available));
$$;
REVOKE ALL ON FUNCTION public.company_module_readable(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.has_business_module(target uuid,module text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.is_merchant_member(target) AND public.company_module_readable(target,module);
$$;
--> statement-breakpoint
CREATE FUNCTION public.company_module_writable(target uuid,module text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.company_module_readable(target,module) AND NOT EXISTS(
 SELECT required FROM unnest(CASE module WHEN 'media' THEN ARRAY['media','website'] WHEN 'pos' THEN ARRAY['pos','catalog'] WHEN 'fnb_orders' THEN ARRAY['fnb_orders','catalog'] WHEN 'kitchen_queue' THEN ARRAY['kitchen_queue','fnb_orders','catalog'] ELSE ARRAY[module] END) required
 WHERE NOT EXISTS(SELECT 1 FROM public.business_module_definitions d WHERE d.key=required AND (
 (d.key IN ('overview','business','settings','website','media','catalog') AND d.access_policy='free') OR
 (d.key IN ('pos','fnb_orders','kitchen_queue') AND d.access_policy='paid' AND (
 (d.trial_eligible AND EXISTS(SELECT 1 FROM public.merchant_module_trials t JOIN public.merchants m ON m.id=t.merchant_id WHERE t.merchant_id=target AND t.module_key=required AND t.starts_at=m.trial_started_at AND t.ends_at=m.trial_ends_at AND t.starts_at<=CURRENT_TIMESTAMP AND t.ends_at>CURRENT_TIMESTAMP)) OR
 EXISTS(SELECT 1 FROM public.business_module_entitlements e WHERE e.merchant_id=target AND e.module_key=required AND e.source IN ('provider','admin') AND e.verified_at<=CURRENT_TIMESTAMP AND e.expires_at>CURRENT_TIMESTAMP)
 )))));
$$;
REVOKE ALL ON FUNCTION public.company_module_writable(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.can_use_business_module(target uuid,module text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.is_merchant_member(target) AND public.company_module_writable(target,module);
$$;
REVOKE ALL ON FUNCTION public.can_use_business_module(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_use_business_module(uuid,text) TO authenticated;
