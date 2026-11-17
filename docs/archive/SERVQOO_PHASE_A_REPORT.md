# SERVQOO — Phase A Report

17 November 2026. Local implementation only. No production migration, customer-data deletion, domain purchase, hosted Auth change or deployment was performed.

## 1. Verified baseline and scope

- Initial working tree was clean at `8b38646` (`0.2.3`). `package.json` is version 0.2.3, newer than the Phase 1.5 report's 0.2.2. The existing lockfile root version was stale at 0.1.0; installing the explicit dependency synchronized it to 0.2.3.
- Inspected Phase 1.5/Phase 1 reports, upload actions and all three file-input paths, media deletion, schema/migrations, supplemental Storage/RLS policies, subscription access and relevant tests. Phase 1.5's reported baseline was 33 files / 220 tests; no separate pre-edit execution of that baseline is claimed. The final expanded suite passes below.
- Repository baseline contained 25 application tables and migrations through 0006. Their actual hosted application status remains unverified; no hosted database was queried in this task.
- Existing uploads accepted 4 MiB and checked signatures without decoding pixels. Authenticated Storage insert/delete policies allowed direct operations, so an application-only quota check would have been bypassable. Media metadata had no size field; counting that table would miss orphaned objects and historical images.

## 2. Branding

User-facing text now uses **SERVQOO**: shared wordmark, authentication/confirmation/recovery screens, dashboard/footer/billing labels, loading animation, browser metadata, Open Graph metadata, PWA name and current product documentation. Existing database plan names containing the old spelling are normalized for display without rewriting subscription records.

The existing S icon, favicon and animation remain. Internal `servqo-*` CSS classes, component identifiers, asset paths, session-storage keys, package identity, component keys, export filename and historical reports remain compatible. Merchant-written/published content was not edited. No database table or merchant ID was renamed.

`servqoo.com` is an intended future domain only. No canonical URL, Supabase Site URL, callback allowlist or production redirect was changed to it. Existing deployment origins/routes are preserved. There are no hosted email templates in this repository; in-code email instructions use the new brand. Updating provider-managed email sender/template branding requires a separate hosted review.

## 3. Image optimization

All current file-upload inputs use `uploadOptimizedImage`: product/menu image selection, Media Library and editor section image upload. Existing gallery/banner/logo uses that select library images or URLs remain compatible; there is no separate business-logo file-upload endpoint in the inspected code.

The shared browser Worker:

- Accepts JPEG, PNG and WebP, with a **20 MiB original limit**. HEIC is explicitly unsupported because no reliable decoder was added.
- Decodes with orientation applied, preserves aspect ratio and alpha, and scales the longest edge to at most **1920px** without upscaling.
- Prefers WebP at **80% quality**, trying 70/60/50% if necessary to fit **2 MiB**; otherwise rejects the image.
- Retains a valid small original when conversion grows it. Logos up to 512px and 256 KiB stay original rather than undergoing needless lossy conversion. Resizing required by the dimension limit can occasionally increase a highly compressed source; the UI reports the actual increase instead of claiming savings.
- Runs decoding/Canvas encoding off the main UI thread and terminates the Worker on completion/error or a 60-second processing bound. A current browser with Worker, ImageBitmap and OffscreenCanvas support is required; unsupported browsers receive an error rather than silently uploading an unoptimized original.

The UI reports original/optimized sizes, actual percentage savings, processing/saving states and XMLHttpRequest upload progress. Network transfer reaching 100% means the server is saving, not that persistence has already succeeded. Success is shown only after the server response. File-content retry IDs are retained per merchant in tab memory/sessionStorage.

`/api/media` validates same-origin requests and delegates to existing authenticated capability/subscription checks. The server independently enforces final byte size, MIME-to-decoded-format match, dimensions, single-frame output and full pixel decoding through explicit **Sharp 0.35.5**. Corrupt/truncated data, SVG, unsupported formats and oversized images are rejected. It does not trust the client's file size, dimension report, merchant authorization or path. The server generates the tenant path from an authorized UUID and retry ID; callers cannot submit a Storage path. Storage network operations have 20-second bounds.

Sharp's distinction between metadata inspection and pixel output informed the full-decode check: [input metadata](https://sharp.pixelplumbing.com/api-input/), [output operations](https://sharp.pixelplumbing.com/api-output/).

## 4. Company storage quota

Limits are centralized in `src/lib/storage-policy.ts`. The migration runner renders the Storage SQL template from those same definitions:

| Policy                                           | Limit   |
| ------------------------------------------------ | ------- |
| Free Core/default allowance                      | 20 MiB  |
| Currently eligible, active trial                 | 50 MiB  |
| Separate verified, unexpired storage entitlement | 100 MiB |

POS/Orders purchases and ordinary paid subscriptions do not grant 100 MiB. No higher storage entitlements are issued by this task. Existing subscription gates still apply to upload/delete; defining a 20 MiB allowance does not introduce permanent free editing rights or bypass Phase 1.5 access rules.

Usage is based on Storage's recorded object sizes under the authorized merchant prefix, including old files and objects without `media_assets` entries. Pending reservations are counted separately, excluding reservations whose objects already exist. Missing/invalid size metadata fails closed instead of counting as zero. `media_assets` is not treated as the byte ledger, and client-provided original sizes do not affect accounting.

Before network upload, a SQL transaction locks the merchant row, checks actual usage plus pending reservations and reserves the server-validated payload size. Other processes must acquire that same lock. No network request occupies this SQL transaction. Storage's insert guard also locks the merchant and requires a matching reservation/size and sufficient current quota. This guards late commits, trial expiry between reservation and upload, privileged unreserved inserts and cancelled reservations.

Successful retries return the existing library record. An uncertain Storage response checks object info and downloads/hashes the existing object before accepting it. A failed or ambiguous upload conservatively retains its reservation; it never silently frees capacity while a network request may still commit. A metadata-insert failure leaves the object counted, with the same retry able to finish metadata creation. No automatic reservation TTL risks undercounting a late commit.

Replacing an image uploads a new immutable object; the old one remains counted until explicitly deleted. This preserves other references and published content and requires temporary spare capacity. Deletion retains the existing confirmation, permission and subscription checks, uses the server Storage client, verifies absence, then clears its reservation/library record. On failure, accounting remains conservative and retryable. Deleting a referenced image can still break that reference; references are not automatically rewritten.

The **Company Storage** panel in Media Library shows actual used/total, remaining capacity, reserved bytes, a progress bar and 80%, 95%, full/over-quota warnings. If a trial expires above 20 MiB, all images remain, public URLs continue working and additional uploads are blocked. Nothing automatically deletes customer images.

## 5. Schema and Storage policies

Pending additive migration **0007_company_storage_quota.sql** adds two private tables, bringing the application total to **27**:

- `media_upload_reservations`: tenant, generated path, validated bytes, content hash and timestamp; retained for retry/accounting until confirmed deletion or explicit pending cancellation.
- `merchant_storage_entitlements`: independent verified-at/expiry/provenance, reserved for an approved future storage policy.

Both use RLS with browser privileges revoked. The new `supabase/storage-quota.sql` template adds the private usage function, reservation insert guard and a **restrictive** policy blocking authenticated/anonymous direct operations against `merchant-media`, even if old permissive policies remain. Public bucket URL reads stay enabled. Validated server operations use the new server-only `SUPABASE_STORAGE_SERVICE_KEY`; it must never use a `NEXT_PUBLIC_` name. Existing Supabase Auth still uses the publishable/anon key.

The bucket's new-upload cap becomes 2 MiB; accepted MIME types remain JPEG/PNG/WebP. Existing larger objects are not rewritten or deleted. The migration runner installs base policies followed by the rendered quota policies in one SQL transaction; a failed guard installation rolls that policy transaction back. Applying only generated table SQL is incomplete. The SQL template contains limit placeholders: use the reviewed migration runner, not raw copy/paste of the unrendered template.

Storage insert-trigger ownership, Supabase's exact metadata write sequence and public-read behavior require real staging acceptance. Disposable host-schema tests do not establish those provider contracts. Storage catalog information is read, not manually edited/deleted; this follows the separation described in [Supabase's Storage schema documentation](https://supabase.com/docs/guides/storage/schema/design).

## 6. Existing images, reconciliation and backfill

No image migration or mass re-encoding is required for usage accounting: existing Storage rows are read on demand. All paths/URLs and published layouts remain unchanged. Catalog objects without library records are included. Library records whose object is missing are reported separately. Unknown sizes block uploads for the affected company until verified/repaired through supported provider operations.

An operator can run the new command **after deployment approval**, against the reviewed target environment:

```powershell
npx.cmd tsx scripts/reconcile-storage.ts MERCHANT_UUID
```

Default behavior reports byte usage, unknown-size objects, objects without library records, missing objects and pending reservation counts. It does not delete images or change records. An explicit `--release RESERVATION_UUID` verifies object absence through Storage, locks the merchant, checks the catalog again and cancels only that pending reservation. The insert guard blocks a later commit without its reservation. This option is an intentional database mutation requiring operator authorization; it was not executed here.

Reconciliation does not automatically delete orphaned objects or invent ownership for paths outside the established merchant-prefix convention. Provider-side physical blobs missing from the entire Storage catalog cannot be enumerated through these SQL queries; provider inventory/support reconciliation remains necessary for that failure class. Existing legacy invalid/unattributed paths require a reviewed ownership mapping, never automatic assignment to an email. Storage and SQL are not a distributed transaction.

## 7. Verification

Final local checks on 17 November 2026:

| Check                                                                                                             | Result                                                                                              |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm.cmd run typecheck`                                                                                           | Passed                                                                                              |
| `npm.cmd run lint`                                                                                                | Passed                                                                                              |
| `npm.cmd run test -- --silent --maxWorkers=2 --testTimeout=30000`                                                 | Final full run: **37 files / 246 tests passed**, 29.15 seconds                                      |
| `node node_modules/vitest/vitest.mjs run tests/storage-quota.test.ts --silent --maxWorkers=1 --testTimeout=30000` | Final focused run: **15 tests passed**, 167.45 seconds                                              |
| `npm.cmd run build`                                                                                               | Passed; optimized compilation, TypeScript, static generation 11/11; new `/api/media` route included |
| `git diff --check`                                                                                                | Passed                                                                                              |

The 220-test foundation is retained with deliberate changes to direct-Storage expectations and the additive table count. Twenty-six added tests cover brand/asset compatibility; real server image decoding; worker encoding through Sharp-backed browser adapters; transparency, corrupt/oversized input and orientation; quota reservations/concurrency/retries; cross-tenant IDs; independent entitlements; trial shrinkage; legacy/orphan accounting; private-table/direct-API access; deletion success/failure, late commits after cancellation and size-changing replacements. All 246 cases passed in the final full run. Existing tests importing actions now explicitly stub Next's `server-only` marker; production boundaries were not removed.

Some intermediate reruns encountered local timing failures: existing sidebar rendering/image encoding exceeded five seconds, and unchanged orders/module database setup exceeded its 60-second fixture deadline. Those attempts were stopped. The final Storage fixture uses a 180-second bootstrap bound; its focused run passed with one worker and 30-second test bounds. After the sequential final build/typecheck/lint completed, the entire suite passed with two workers and 30-second test bounds. No application request/loading timeout was relaxed. These earlier local startup failures are not evidence of a hosted application failure.

Final code validation also ran the underlying CLIs sequentially: `node node_modules/next/dist/bin/next build`, `node node_modules/typescript/bin/tsc --noEmit`, then `node node_modules/eslint/bin/eslint.js .`; the command completed with exit 0. Earlier npm-script builds/typechecks/lint also passed. The final production build compiled and generated all 11 static entries successfully.

Real headless Edge additionally passed seven checks using the actual Worker/ImageBitmap/Canvas APIs: WebP/1920px/2 MiB output, alpha preservation, small-logo preservation, EXIF orientation, corrupt data, HEIC rejection and the 20 MiB original ceiling. This was a local isolated browser test, not a hosted upload test. No real customer images or credentials were used.

Database tests run real migrations, quota functions, trigger, RLS and service code on disposable PGlite with a stubbed Supabase host schema/Storage transport. They do not prove hosted Storage behavior, cross-region latency or production multi-connection load capacity. Vitest retains its existing non-fatal config-loader warning. Dependency installation reported 11 moderate audit findings; no broad dependency remediation or security certification is claimed.

## 8. Deployment steps and approvals

### Production mismatch reported during this task

The user reports production `dashboard.load`, stage `modules`, code **42P01**. PostgreSQL defines this as an undefined relation. It is consistent with missing Phase 1 module tables, but the supplied log does not identify the relation or prove which migrations are applied. No production inspection, migration or workaround was attempted. Module queries, authorization and entitlement checks remain enabled. Phase A is not a repair or bypass for this separate incident.

### Exact dependency chain

| Order | Dependency                                | What the current code requires                                                                                                                                                                        |
| ----- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Existing migrations 0000–0004             | Merchant/auth membership, builder/menu/media, subscription/trial and POS foundation; retain their existing records and published component versions                                                   |
| 2     | `0005_multi_industry_foundation`          | `merchants.business_type`; `business_module_definitions`, `merchant_modules`, `business_module_entitlements`; module initialization, role/capability/module helpers and included/legacy backfill      |
| 3     | `0006_system_services_onboarding`         | `merchants.onboarding_step`, `merchants.onboarding_services`, validation constraint and pricing metadata updates that depend on 0005's definitions table                                              |
| 4     | Phase A `0007_company_storage_quota`      | Private reservations and independent storage entitlements, their merchant FKs/RLS; does not replace 0005/0006                                                                                         |
| 5     | Matching supplemental policy installation | `supabase/policies.sql`, then rendered `supabase/storage-quota.sql` in the same policy transaction; private usage function, restrictive Storage policy, insert/size-change guard and 2 MiB bucket cap |
| 6     | Catalog registration and compatible code  | Existing catalog registration preserves deployed component versions; Phase A code also needs the server-only Storage credential configured for the same project                                       |

**Separate the rollouts.** First resolve and validate production's 0005/0006 mismatch through a separately approved, reviewed bundle that stops at 0006 and uses its matching pre-Phase-A policy installer. Confirm actual journal/schema state and existing-merchant/new-user access. Do not use this Phase A working tree's migration command merely to repair the old mismatch: it applies every pending migration, including 0007, and installs the new Storage guard.

Only after the production mismatch is resolved should an approved Phase A staging rollout provision the server credential, apply 0007 and the matching policy/function/trigger installation, register the existing catalog, and release compatible application code in a coordinated window. Accept hosted upload/retry/delete/public-read/concurrency behavior before production rollout. No production branch push or deployment was performed. Phase B/C remain separate future rollouts.

1. Review and stage any pending **0005**, **0006**, then **0007**, plus supplemental policy/trigger changes. Confirm the actual deployed migration journal instead of assuming earlier reports reflect production.
2. Provision the server-only Storage credential for the **same** Supabase project, without changing public Auth keys/origins. Keep it out of browser variables/logs.
3. Review trigger privileges and exact hosted Storage behavior in staging. Run the established `npm.cmd run db:migrate` workflow only when authorized; it now renders/applies quota SQL after base policies. No seed/reset is needed.
4. Use a coordinated maintenance window/code rollout: old code's direct authenticated uploads will be blocked by the new policies, and new code requires the new tables/functions/key. Do not deploy one half independently to production.
5. Reconcile representative existing companies, including unknown sizes, orphan/library discrepancies and over-quota trials. Do not automatically delete or re-encode their files.
6. Verify real upload/retry/delete, public URLs, concurrent uploads from separate functions, expired-trial read behavior and direct authenticated Storage denial before production acceptance. Inspect safe correlation logs.
7. Domain connection, Auth allowlists, sender branding and canonical-domain changes are separate approvals after domain ownership/HTTPS are verified. None were performed here.

## 9. Files and remaining limitations

| Area                      | Main files                                                                                                                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand                     | `src/components/brand.tsx`, `servqo-loading.tsx`, auth components/pages, dashboard/sidebar/billing, `src/app/layout.tsx`, `manifest.ts`, `src/lib/subscription-service.ts`, README and current docs                        |
| Image processing          | `public/image-worker.js`, `src/lib/image-upload.ts`, `image-validation.ts`, `uploads.ts`, `src/components/image-progress.tsx`; product/editor/media integrations                                                           |
| Storage                   | `src/lib/storage-policy.ts`, `storage-admin.ts`, `src/server/storage-service.ts`, `storage-actions.ts`, existing upload/deletion services, `src/components/dashboard/company-storage.tsx`, `/api/media`, scoped global CSS |
| Deployment/reconciliation | Migration 0007/snapshot/journal, `supabase/storage-quota.sql`, `scripts/migrate.ts`, `reconcile-storage.ts`, `.env.example`                                                                                                |
| Dependencies/tests        | Explicit Sharp dependency/lockfile; four new test files and affected SQL/action fixtures                                                                                                                                   |

The implementation is ready for **review and staged integration**, not a claim that hosted enforcement is already active. The new Storage credential, pending migrations and provider-trigger acceptance remain required. Unsupported browsers/HEIC receive explicit errors; no decoder fallback was added. Failed uploads may reserve capacity until retry/operator reconciliation. Snapshot queries scan company objects rather than maintaining a potentially drifting counter; measure large-library performance before scaling. No real billing, higher-storage purchase flow, permanent free write-access model or automatic physical-orphan cleanup was introduced.
