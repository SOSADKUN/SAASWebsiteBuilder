CREATE TABLE "merchant_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"module_key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_module_definitions" (
	"key" text PRIMARY KEY NOT NULL,
	"available" boolean DEFAULT false NOT NULL,
	"pricing" jsonb DEFAULT '{"mode":"demo"}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_module_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"module_key" text NOT NULL,
	"source" text DEFAULT 'included' NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "module_source_valid" CHECK ("business_module_entitlements"."source" IN ('included','legacy','provider','admin'))
);
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "business_type" text DEFAULT 'cafe' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchant_modules" ADD CONSTRAINT "merchant_modules_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_modules" ADD CONSTRAINT "merchant_modules_module_key_business_module_definitions_key_fk" FOREIGN KEY ("module_key") REFERENCES "public"."business_module_definitions"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_module_entitlements" ADD CONSTRAINT "business_module_entitlements_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_module_entitlements" ADD CONSTRAINT "business_module_entitlements_module_key_business_module_definitions_key_fk" FOREIGN KEY ("module_key") REFERENCES "public"."business_module_definitions"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_module_unique" ON "merchant_modules" USING btree ("merchant_id","module_key");--> statement-breakpoint
CREATE UNIQUE INDEX "module_entitlement_unique" ON "business_module_entitlements" USING btree ("merchant_id","module_key");
--> statement-breakpoint
ALTER TABLE public.merchants ADD CONSTRAINT merchant_business_type_valid CHECK (business_type IN ('cafe','bakery','nail_salon','hair_salon','beauty_studio','other'));
--> statement-breakpoint
INSERT INTO public.business_module_definitions(key,available,pricing) VALUES ('overview',true,'{"mode":"included"}'::jsonb),('business',true,'{"mode":"included"}'::jsonb),('settings',true,'{"mode":"included"}'::jsonb),('website',true,'{"mode":"included"}'::jsonb),('media',true,'{"mode":"included"}'::jsonb),('catalog',true,'{"mode":"included"}'::jsonb),('pos',true,'{"mode":"included"}'::jsonb),('fnb_orders',true,'{"mode":"included"}'::jsonb),('kitchen_queue',true,'{"mode":"included"}'::jsonb),('customers',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('employees',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('qr_ordering',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('tables',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('cake_preorders',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('cake_customization',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('pickup_schedule',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('production_calendar',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('cake_deposits',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('appointments',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('services',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('staff_availability',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('appointment_calendar',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('service_checkout',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('inventory',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('loyalty',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('multi_outlet',false,'{"mode":"demo","monthlyExample":2900}'::jsonb),('analytics',false,'{"mode":"demo","monthlyExample":2900}'::jsonb);
--> statement-breakpoint
-- Preserve existing Editor access explicitly; new editor assignments use least privilege.
UPDATE public.merchant_users SET role='legacy_editor' WHERE role='editor';
--> statement-breakpoint
CREATE FUNCTION public.initialize_business_modules() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 INSERT INTO public.merchant_modules(merchant_id,module_key,enabled)
 SELECT NEW.id,key, key IN ('overview','business','settings','website','media','catalog') OR NEW.business_type IN ('cafe','bakery') FROM public.business_module_definitions WHERE available;
 INSERT INTO public.business_module_entitlements(merchant_id,module_key,source)
 SELECT NEW.id,key,'included' FROM public.business_module_definitions WHERE available;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER initialize_business_modules AFTER INSERT ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.initialize_business_modules();
--> statement-breakpoint
INSERT INTO public.merchant_modules(merchant_id,module_key,enabled) SELECT m.id,d.key,true FROM public.merchants m CROSS JOIN public.business_module_definitions d WHERE d.available;
--> statement-breakpoint
INSERT INTO public.business_module_entitlements(merchant_id,module_key,source) SELECT m.id,d.key,'legacy' FROM public.merchants m CROSS JOIN public.business_module_definitions d WHERE d.available;
--> statement-breakpoint
CREATE FUNCTION public.has_merchant_capability(target uuid, capability text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.merchant_users u WHERE u.merchant_id=target AND u.user_id=auth.uid() AND (
 u.role='owner' OR (u.role IN ('manager','legacy_editor') AND capability IN ('workspace:view','pos:operate','orders:view','orders:manage','website:view','website:manage','media:view','media:manage','menu:view','menu:manage','business:view','business:manage','marketplace:use','settings:view','data:export','reports:view')) OR
 (u.role='editor' AND capability IN ('workspace:view','business:view','website:view','website:manage','media:view','media:manage','marketplace:use')) OR
 (u.role='cashier' AND capability IN ('workspace:view','business:view','menu:view','pos:operate')) OR
 (u.role='kitchen' AND capability IN ('workspace:view','business:view','orders:view','orders:manage')) OR
 (u.role='technician' AND capability IN ('workspace:view','business:view'))));
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.has_merchant_capability(uuid,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.has_merchant_capability(uuid,text) TO authenticated;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_merchant_member(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.merchant_users WHERE merchant_id=target AND user_id=auth.uid()); $$;
--> statement-breakpoint
CREATE FUNCTION public.has_business_module(target uuid, module text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.is_merchant_member(target) AND NOT EXISTS (
 SELECT required FROM unnest(CASE module
 WHEN 'media' THEN ARRAY['media','website']
 WHEN 'pos' THEN ARRAY['pos','catalog']
 WHEN 'fnb_orders' THEN ARRAY['fnb_orders','catalog']
 WHEN 'kitchen_queue' THEN ARRAY['kitchen_queue','fnb_orders','catalog']
 ELSE ARRAY[module] END) required
 WHERE NOT EXISTS(SELECT 1 FROM public.merchant_modules c
 JOIN public.business_module_definitions d ON d.key=c.module_key AND d.available
 JOIN public.business_module_entitlements e ON e.merchant_id=c.merchant_id AND e.module_key=c.module_key
 WHERE c.merchant_id=target AND c.module_key=required AND c.enabled AND (e.expires_at IS NULL OR e.expires_at>CURRENT_TIMESTAMP)));
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.has_business_module(uuid,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.has_business_module(uuid,text) TO authenticated;
--> statement-breakpoint
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['business_module_definitions','merchant_modules','business_module_entitlements'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 END LOOP;
END $$;
--> statement-breakpoint
CREATE POLICY module_definition_read ON public.business_module_definitions FOR SELECT TO authenticated USING(true);
--> statement-breakpoint
CREATE POLICY module_configuration_read ON public.merchant_modules FOR SELECT TO authenticated USING(public.is_merchant_member(merchant_id));
--> statement-breakpoint
CREATE POLICY module_license_read ON public.business_module_entitlements FOR SELECT TO authenticated USING(public.is_merchant_member(merchant_id));
