# SERVQOO deployment runbook

Current reference: [Project Guide](docs/SERVQOO_PROJECT_GUIDE.md). The previous deployment notes are preserved [unchanged in the archive](docs/archive/DEPLOYMENT_PRE_CONSOLIDATION.md); their old table counts, upload limits and no-Storage-key claim are superseded. This is a runbook, not a successful production deployment audit.

## Stop before an unmigrated rollout

Reported production `dashboard.load/modules/42P01` indicates an undefined relation, not a paid membership to bypass. The actual missing relation, project/journal and runtime target need separate verification. No migration, production inspection, reset or deployment occurred during consolidation. A build does not apply migrations.

The full working tree requires 0000-0004 as applicable, then **0005 -> 0006 -> 0007 -> 0008**, matching base/Storage policies and deployed catalog. There are 28 application tables. `scripts/migrate.ts` applies ALL pending migrations, then base and rendered quota policies together, then catalog. Do not use it blindly for a narrow 0005/0006 production repair. Later stages can fail after schema changes; inspect state, never clear migration history.

## Reviewed staging setup

1. Confirm the project/environment/branch and back up the actual target. Keep preview/development separate from customer data. Review restore procedure, legacy license/configuration state and unknown Storage sizes.
2. Use Node 22, `npm ci`, Next.js preset, `npm run build` and normal server deployment. Do not add migrations/seeds to a build hook or use static export.
3. Supply the [environment variables](docs/SERVQOO_PROJECT_GUIDE.md#16-environment-variables-names-and-purposes-only). Runtime uses a suitable pooled DB URI; controlled migration tooling uses direct/session mode, never transaction port 6543. Preserve verified TLS/prepared-statement/pipeline safeguards.
4. Phase A requires **server-only `SUPABASE_STORAGE_SERVICE_KEY`** for validated Storage operations. Never place it or the database URI in public variables. Keep the public publishable/legacy anon key separate. Old direct browser uploads conflict with the new restrictive policies, so coordinate code/key/policies.
5. After independent approval for that target, run the existing full migration workflow and inspect actual schema/journal, catalog, privileges, RLS, functions and triggers. No seed/reset is required. The guide documents the command; this runbook does not authorize production execution.
6. `db:check` is read-only but still has an outdated assumption requiring SELECT policies on every table. The two private Storage accounting tables intentionally lack browser SELECT. Do not grant access to satisfy that check; fix/review the diagnostic during the final audit and inspect new trial/quota helpers separately.

## Auth and public origins

Use the actual approved application origin in `NEXT_PUBLIC_APP_URL`, Supabase Site URL and exact callback allowlists. Current confirmation path is `/auth/confirm`; recovery is `/auth/recovery`. Local HTTP belongs only to development; production uses HTTPS. PKCE links need the initiating browser's cookie context. Do not log token/code URLs.

The application supports both PKCE and token-hash confirmation. A reviewed Supabase confirmation template can use the existing supplied redirect URL:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email"
  >Activate your SERVQOO account</a
>
```

Do not append the callback path twice. Token-hash links lead to explicit POST activation; default Supabase verification/PKCE links exchange the code and reach `/auth/confirmed`. Request fresh emails after configuration changes. Hosted email/SMTP/template behavior must be tested manually; this task configured no email provider.

The existing `servqo.vercel.app` URL is intentionally not renamed in compatibility references. Intended `servqoo.com` ownership/connection are unverified. Follow [public/domain preparation](docs/PUBLIC-GO-LIVE.md) for DNS/HTTPS, optional canonical/marketing redirects and any separately approved Auth transition. Merely changing a marketing origin does not transfer cookies or update hosted Auth settings.

## Acceptance before production approval

- New/existing accounts, verification/recovery, signed-out protected access, missing-membership onboarding and resumable setup.
- Expired Free Core catalog, draft/publish and one multi-page site; unowned premium design denial; unchanged old publications/renderer versions.
- JPEG/PNG/WebP originals up to 20 MiB optimized to final 2 MiB, quota enforcement, retry/orphan behavior, confirmed deletion and public URL reads. Unknown sizes/over-quota data must not trigger automatic deletion.
- Direct browser Storage/app-table write denial, private accounting isolation and cross-company/role denials.
- Two-device POS -> staff queue -> completion/cancellation/acknowledgement, exact retries, expiry behavior and manually recorded cash versus unpaid gross totals.
- Export, module configuration dependencies, resolved `42P01`, safe request references and measured hosted latency/connection usage.
- Public routes/canonicals/robots/sitemap/contact, reviewed legal identity/policies and disabled payment previews. Coming Soon modules stay unavailable.

Retain backups and compatible application/policy artifacts. Rollback must preserve data, claims, migration journal, legacy component versions and Storage guards; never revert permissive policies alone or manufacture renewed trials. Prefer a reviewed forward correction. No successful production acceptance is implied by this documentation.
