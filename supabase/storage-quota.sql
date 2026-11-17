-- Template: compiled with centralized storage-policy.ts limits by scripts/migrate.ts.
-- Private accounting reads Storage metadata; never edits storage.objects.
ALTER TABLE public.media_upload_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_storage_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_upload_reservations, public.merchant_storage_entitlements FROM PUBLIC, anon, authenticated;
-- A restrictive policy blocks any accidentally retained permissive browser policy.
DROP POLICY IF EXISTS server_media_writes_only ON storage.objects;
CREATE POLICY server_media_writes_only ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
 USING (bucket_id <> 'merchant-media') WITH CHECK (bucket_id <> 'merchant-media');
-- Public bucket reads still use Storage's public URL endpoint.
UPDATE storage.buckets SET file_size_limit=2097152, allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'] WHERE id='merchant-media';

CREATE OR REPLACE FUNCTION public.company_storage_snapshot(mid uuid)
RETURNS TABLE(used_bytes bigint,reserved_bytes bigint,limit_bytes bigint) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.merchants WHERE id=mid) THEN RAISE EXCEPTION 'Business unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='merchant-media' AND split_part(name,'/',1)=mid::text
 AND (metadata->>'size' IS NULL OR metadata->>'size' !~ '^[0-9]+$')) THEN
 RAISE EXCEPTION 'Storage reconciliation required'; END IF;
 RETURN QUERY SELECT
 coalesce((SELECT sum((metadata->>'size')::bigint) FROM storage.objects WHERE bucket_id='merchant-media' AND split_part(name,'/',1)=mid::text),0)::bigint,
 coalesce((SELECT sum(r.bytes) FROM public.media_upload_reservations r WHERE r.merchant_id=mid AND NOT EXISTS
 (SELECT 1 FROM storage.objects o WHERE o.bucket_id='merchant-media' AND o.name=r.path)),0)::bigint,
 CASE WHEN EXISTS(SELECT 1 FROM public.merchant_storage_entitlements WHERE merchant_id=mid AND verified_at<=now() AND expires_at>now() AND source IN ('provider','admin')) THEN __VERIFIED_BYTES__::bigint
 WHEN EXISTS(SELECT 1 FROM public.merchants m JOIN public.merchant_subscriptions s ON s.merchant_id=m.id WHERE m.id=mid AND m.trial_started_at<=now() AND m.trial_ends_at>now()) THEN __TRIAL_BYTES__::bigint
 ELSE __FREE_BYTES__::bigint END;
END $$;
REVOKE ALL ON FUNCTION public.company_storage_snapshot(uuid) FROM PUBLIC,anon,authenticated;

-- Late network commits after reconciliation cannot recreate unreserved objects.
-- Hosted Storage compatibility/trigger privileges must be accepted in staging.
CREATE OR REPLACE FUNCTION public.guard_company_media_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE mid uuid; reservation public.media_upload_reservations; usage record;
BEGIN
 IF NEW.bucket_id <> 'merchant-media' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.name=NEW.name AND OLD.bucket_id=NEW.bucket_id AND (OLD.metadata->>'size') IS NOT DISTINCT FROM (NEW.metadata->>'size') THEN RETURN NEW; END IF;
 mid:=split_part(NEW.name,'/',1)::uuid;
 PERFORM id FROM public.merchants WHERE id=mid FOR UPDATE;
 SELECT * INTO reservation FROM public.media_upload_reservations WHERE path=NEW.name AND merchant_id=mid;
 IF reservation.id IS NULL OR NEW.metadata->>'size' IS NULL OR (NEW.metadata->>'size')::bigint<>reservation.bytes THEN
 RAISE EXCEPTION 'Validated upload reservation required'; END IF;
 SELECT * INTO usage FROM public.company_storage_snapshot(mid);
 IF usage.used_bytes+usage.reserved_bytes>usage.limit_bytes THEN RAISE EXCEPTION 'Company storage quota exceeded'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_company_media_insert() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_company_media_insert ON storage.objects;
CREATE TRIGGER guard_company_media_insert BEFORE INSERT OR UPDATE OF name,bucket_id,metadata ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.guard_company_media_insert();
