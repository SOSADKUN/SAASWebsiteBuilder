# Public discovery and domain preparation

Phase C is local preparation, not a deployment or paid launch. Read the [Project Guide](SERVQOO_PROJECT_GUIDE.md) and [archived Phase C report](archive/SERVQOO_PHASE_C_REPORT.md) and preserve the Phase A/B migration dependencies. The reported production `dashboard.load/modules/42P01` must be repaired separately before promoting signup traffic.

## Configuration

- `SERVQOO_PUBLIC_ORIGIN`: the verified HTTPS marketing origin, without path/query. Blank falls back to the existing valid HTTPS `NEXT_PUBLIC_APP_URL` for metadata only. No value is assumed to be `servqoo.com`. Invalid/missing origins omit canonical URLs and disable search indexing/sitemap entries. Vercel preview environments are excluded from indexing. Public origin is independent of the Auth origin; this phase does not edit hosted Auth settings.
- `SERVQOO_REDIRECT_FROM_HOSTS`: optional comma-separated old verified hostnames. Blank enables no redirect. When explicitly configured with a valid public origin, Next redirects only public marketing paths, preserving their query parameters; it never redirects `/auth`, `/login`, `/signup`, `/dashboard`, `/api` or merchant `/sites` URLs. The canonical host is excluded to avoid a loop. Rebuild after changing these environment settings.
- `SERVQOO_CONTACT_EMAIL`: business-supplied public email. Missing/invalid values hide the method. A mailto link uses the visitor's email client; no application email delivery is implemented.
- `SERVQOO_WHATSAPP_NUMBER`: confirmed WhatsApp Business number, international digits only, without `+`/spaces. Missing/invalid values hide the method. No outbound message is sent by SERVQOO.

Contact details are public information rendered at build/render time. No contact form, submission endpoint, inbox, Resend or SMTP configuration was added. If a form is introduced later, it must have server validation, durable rate limiting, bot controls, privacy/retention notice, bounded verified delivery, safe failure handling and no sensitive submissions in logs. Do not display a working form without delivery.

## Future domain rollout (requires separate approval)

1. Confirm purchase/ownership of `servqoo.com`. Decide whether apex or `www` is canonical; the intended name is not proof it is available or connected.
2. In the correct Vercel project, add the domain under Settings -> Domains. Complete any ownership verification and apply the exact DNS records shown for that project. Do not copy guessed A/CNAME values. Verify DNS, HTTPS and the intended deployment before advertising the domain. See [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
3. Configure the alternate apex/`www` domain to redirect to the chosen canonical in Vercel, or use the explicit marketing-only redirect allowlist above for approved old hosts. Keep Auth/API/tenant URL migrations separate. See [Vercel domain redirects](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting).
4. Once the target really serves this application over HTTPS, set `SERVQOO_PUBLIC_ORIGIN` for production and rebuild. Verify canonical and Open Graph URLs, `/robots.txt` and `/sitemap.xml`. Sitemap includes landing/pricing/demo/contact only; draft legal pages and purchase previews have `noindex`. Preview deployments are never the canonical origin.
5. Only as a coordinated Auth change, update `NEXT_PUBLIC_APP_URL` and Supabase Authentication -> URL Configuration: set the actual Site URL and exact approved callback/recovery redirect URLs used by this repository. Review existing confirmation/recovery routes and email-template links before editing. Keep needed old-origin callbacks during transition; avoid broad wildcard production permissions. See [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls).
6. Test sign-up -> verification -> setup -> service selection -> Dashboard and password recovery on the new origin. Sessions are host-scoped; a redirect does not transfer cookies between unrelated hosts. Verify email links, safe return paths and sign-out on real devices before retiring the old origin. This phase changes neither cookies nor callback behavior.
7. Resolve the existing production schema mismatch and perform Phase A/B acceptance before any application rollout. No DNS, Vercel, Supabase configuration, migration, Storage policy or domain purchase action has been executed here.

The setup instructions were checked against the linked official Vercel/Supabase documentation on 17 November 2026. Use the actual dashboards' current record values during a future approved rollout.

## Content approval before marketing/paid launch

- Supply operator/legal entity, business address, applicable registration details, jurisdiction, confirmed contact channels and effective dates. Edit `src/lib/legal-content.ts`; five public drafts visibly mark unresolved details. Do not remove review labels until approved.
- Finalize seller price/tax/invoice treatment, exact calendar-month activation/expiry semantics, maintenance/support scope, cancellation/refund eligibility, data retention/deletion and discontinuation/export notice. Preview prices are centralized `service-pricing.ts` values, not provider products.
- Connect a verified, audited and idempotent purchase issuer separately before enabling checkout. Show exact period timestamps before accepting any payment. The current proposed calendar-month period clamps an absent day to the next month's final day at the same UTC time; no period is created now. Renewals must not silently reset or shorten access.
- Keep available capabilities honest: product pickup POS and staff queue exist; appointments, staff scheduling and custom cake pre-orders do not. No card/QR processing, hardware, offline engine, public customer display, guaranteed response time or 24/7 support is provided.
- Validate social sharing in actual Instagram/Xiaohongshu browsers, local language/copy, accessibility and contact handling. No analytics/advertising pixel or social account is connected by this phase. Production email delivery, paid commerce and legal compliance are not established by a successful local build.
