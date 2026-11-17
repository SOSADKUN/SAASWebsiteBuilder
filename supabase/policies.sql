-- Run after Drizzle migrations as the database owner, on a Supabase project.
-- Browser clients get no direct write access to application tables. All writes
-- use authenticated server actions, tenant predicates and database transactions.
CREATE OR REPLACE FUNCTION public.is_merchant_member(target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.merchant_users WHERE merchant_id = target AND user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_merchant_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_merchant_member(uuid) TO authenticated;

DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['user_profiles','merchants','merchant_users','websites','pages','page_sections','component_definitions','component_versions','store_products','merchant_entitlements','menu_categories','menu_products','media_assets','website_revisions','subscription_plans','merchant_subscriptions','subscription_events','merchant_trial_claims'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['websites','pages','page_sections','merchant_entitlements','menu_categories','menu_products','media_assets','website_revisions'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS tenant_read ON public.%I', t);
  EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id))', t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['component_definitions','component_versions','store_products'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS catalog_read ON public.%I', t);
  EXECUTE format('CREATE POLICY catalog_read ON public.%I FOR SELECT TO authenticated USING (true)', t);
 END LOOP;
END $$;
DROP POLICY IF EXISTS profile_self ON public.user_profiles;
CREATE POLICY profile_self ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS membership_self ON public.merchant_users;
CREATE POLICY membership_self ON public.merchant_users FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS merchant_member ON public.merchants;
CREATE POLICY merchant_member ON public.merchants FOR SELECT TO authenticated USING (public.is_merchant_member(id));

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('merchant-media','merchant-media',true,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=5242880,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];
DROP POLICY IF EXISTS merchant_upload ON storage.objects;
CREATE POLICY merchant_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='merchant-media' AND public.is_merchant_member((storage.foldername(name))[1]::uuid)
 AND public.merchant_has_subscription((storage.foldername(name))[1]::uuid)
);
DROP POLICY IF EXISTS merchant_remove_upload ON storage.objects;
DROP POLICY IF EXISTS merchant_read_upload ON storage.objects;
CREATE POLICY merchant_read_upload ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='merchant-media' AND public.is_merchant_member((storage.foldername(name))[1]::uuid)
);
CREATE POLICY merchant_remove_upload ON storage.objects FOR DELETE TO authenticated USING (
 bucket_id='merchant-media' AND public.is_merchant_member((storage.foldername(name))[1]::uuid)
);
-- Media is intentionally public for published websites. Draft content and
-- transactional tables remain private; never upload confidential media.

-- Phase 1: capability/module reads replace broad membership-only content reads.
DO $$ DECLARE t text; cap text; mod text; BEGIN
 FOR t,cap,mod IN SELECT * FROM (VALUES
 ('websites','website:view','website'),('pages','website:view','website'),
 ('page_sections','website:view','website'),('website_revisions','website:view','website'),
 ('merchant_entitlements','website:view','website'),('media_assets','media:view','media'),
 ('menu_categories','menu:view','catalog'),('menu_products','menu:view','catalog')) AS x(t,cap,mod) LOOP
 EXECUTE format('DROP POLICY IF EXISTS tenant_read ON public.%I',t);
 IF t IN ('menu_categories','menu_products') THEN
 EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING ((public.has_merchant_capability(merchant_id,%L) AND public.has_business_module(merchant_id,%L)) OR (public.has_merchant_capability(merchant_id,''website:view'') AND public.has_business_module(merchant_id,''website'')))',t,cap,mod);
 ELSE
 EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING (public.has_merchant_capability(merchant_id,%L) AND public.has_business_module(merchant_id,%L))',t,cap,mod);
 END IF;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['pos_orders','pos_order_items','pos_order_events'] LOOP
 EXECUTE format('DROP POLICY IF EXISTS pos_tenant_read ON public.%I',t);
 EXECUTE format('CREATE POLICY pos_tenant_read ON public.%I FOR SELECT TO authenticated USING ((public.has_merchant_capability(merchant_id,''pos:operate'') AND public.has_business_module(merchant_id,''pos'')) OR (public.has_merchant_capability(merchant_id,''orders:view'') AND public.has_business_module(merchant_id,''kitchen_queue'')))',t);
 END LOOP;
END $$;
DROP POLICY IF EXISTS merchant_upload ON storage.objects;
CREATE POLICY merchant_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='merchant-media' AND public.merchant_has_subscription((storage.foldername(name))[1]::uuid)
 AND ((public.has_merchant_capability((storage.foldername(name))[1]::uuid,'media:manage') AND public.has_business_module((storage.foldername(name))[1]::uuid,'media'))
 OR (public.has_merchant_capability((storage.foldername(name))[1]::uuid,'menu:manage') AND public.has_business_module((storage.foldername(name))[1]::uuid,'catalog')))
);
DROP POLICY IF EXISTS merchant_remove_upload ON storage.objects;
CREATE POLICY merchant_remove_upload ON storage.objects FOR DELETE TO authenticated USING (
 bucket_id='merchant-media' AND public.merchant_has_subscription((storage.foldername(name))[1]::uuid)
 AND public.has_merchant_capability((storage.foldername(name))[1]::uuid,'media:manage')
 AND public.has_business_module((storage.foldername(name))[1]::uuid,'media')
);
