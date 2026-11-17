# SERVQOO Phase B ? Permanent Free Core and service trial

17 November 2026 (Asia/Kuala_Lumpur). Implemented locally on the existing Phase A working tree. No push, deployment, external database migration, production Storage policy change, seed, reset or production data deletion was performed. All Phase A branding/image/quota work remains in place.

## Final product policy

| Access              | Current contract                                                                                                                                                                                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permanent Free Core | Dashboard, basic business/profile/settings, basic product/category catalog, basic website draft editing and publishing, media within Company Storage Quota, service discovery, billing information and tenant-authorized JSON export. Existing sign-in/account flows remain available; no new account administration screen is claimed. |
| One free website    | One existing `websites` property per company (`merchant_id` unique), with multiple pages. Existing public URLs, pages and published snapshots are preserved. No one-page restriction or second website entity was added.                                                                                                                |
| Paid services       | Implemented product POS plus Orders/Kitchen Queue need either an active explicit company service trial or a verified company/module entitlement for new operations. Dependencies and role capabilities remain mandatory.                                                                                                                |
| Trial               | Original first 14 days, no card, no automatic charge, no extension on service/type changes or login. Any compatible, implemented, trial-eligible service can be selected, including non-recommended product POS for salon retail.                                                                                                       |
| Expiry              | Core remains writable. Published website/images/history remain. Enabled paid screens retain authorized history and safe completion/cancellation of existing tickets; new tickets stop.                                                                                                                                                  |
| Designs             | Component ownership is separate from Core and service licensing. Unowned premium designs remain preview-only and cannot save/publish. Existing owned designs still save/publish after expiry. New explicit demo design unlocks retain their earlier subscription gate; no premium ownership is granted by this phase.                   |
| Storage             | Phase A 20 MiB free / original trial 50 MiB / separately verified Storage entitlement 100 MiB. Service licenses do not raise storage. Over-quota images are retained; delete to recover space before uploading.                                                                                                                         |

No new page-count cap was introduced; current path/title/layout/input validation still applies. Storage is the explicit byte quota. Additional fair-use/request-rate policy, custom domains, employee administration and premium website plans remain future work. One account normally starts one company through the existing immutable trial claim; existing membership architecture and historical memberships are preserved. No employee invitations or company switcher was added.

## Authorization design

`business-modules.ts` now distinguishes `accessPolicy` and `trialEligible`. Six implemented Core modules (`overview`, `business`, `settings`, `website`, `media`, `catalog`) are mandatory/free. Three deployed paid modules (`pos`, `fnb_orders`, `kitchen_queue`) are trial-eligible. All Coming Soon implementations remain unavailable regardless of client input or a fabricated entitlement.

New `merchant_module_trials` records authorization per **merchant_id + module_key** with original start/end dates. Merchant initialization inserts these records transactionally. Existing companies receive a backfill using their unchanged dates, including already expired windows. A trigger rejects trial updates/deletes and invalid inserts; browser clients have only membership-scoped SELECT, never issuance/extension rights. The original merchant trial dates and one-trial-per-Auth-subject claim remain enforced. This is account-level anti-abuse, not verified identity across separately created Auth accounts.

`merchantModuleState` joins real company configuration, deployed database availability/policy, trials and licenses. PostgreSQL time determines eligibility. Paid verification requires `source=provider|admin`, `verified_at <= now`, and `expires_at > now`; a check constraint requires a valid verified period. A shorter paid period does not truncate an otherwise valid trial. There is no merchant-facing issuer, gateway, fake payment, automatic renewal or automatic paid status write.

Prior `included`/`legacy` paid license rows remain intact as provenance but do not grant perpetual paid operations after expiry. Existing `provider`/`admin` rows without the newly required verification timestamp are not silently trusted or backfilled as verified. A verified base subscription does not grant all service licenses. Actual historic paid claims would need a separately reviewed reconciliation before rollout.

Read/fulfillment access (`moduleReadable`, SQL `has_business_module`) is deliberately separate from starting paid operations (`moduleAccess`, SQL `can_use_business_module`). Both retain real module configuration/availability and dependencies, and callers separately require company membership and capability. Disabled modules stay hidden/denied; data remains exportable. Missing tables/columns still propagate to the existing diagnostic error handling. There is **no 42P01 fallback or disabled authorization query**.

Free catalog, website/page save/publish, media upload/removal and service configuration no longer invoke the blanket base subscription write gate. Storage quota validation, byte decoding, reservation/late-write guards, role checks, tenant predicates and premium design validation remain. SQL's old permissive Storage subscription predicate was removed locally; Phase A restrictive policies continue to deny direct browser Storage mutation. Public media reads remain intentional. Application-table browser writes remain revoked.

## Onboarding, navigation and unfinished tickets

The existing wizard is reused: Business Details -> Business Type -> System Services -> Trial Review -> Dashboard. Free tools appear as included Core copy, not optional paid checkboxes. No optional services is valid. Recommendations remain business-type based; View all exposes implemented compatible options. Saved selection is revalidated at confirmation. Existing completed companies do not repeat setup. The owner-only plus button and persistent management flow are retained.

Trial banner reuses the server snapshot plus elapsed time, shows expiry/days, selected paid services, illustrative MYR monthly estimate and no automatic charges. After expiry it names services needing entitlement without blocking Core. Verified base subscription status does not extend the service trial. Enabled expired service links display History; POS explains its new-order restriction. Server checks remain authoritative when a browser snapshot grows stale.

New POS authorization occurs inside the order transaction after exact request reconciliation. A committed same UUID/fingerprint retry returns its original ticket even after expiry; changed contents still fail. Company locking serializes creation against owner configuration, and existing price/availability/counter/item/event/version checks remain.

Existing tickets can safely progress pending -> preparing -> ready -> completed after expiry. Only pending tickets can cancel, with a reason; acknowledgement remains available. These paths preserve capabilities, tenant scope, version conflicts, transition checks and audit events, and cannot alter order items/totals/payments. Active tickets or unacknowledged cancellations block service disabling, preventing an owner from hiding unfinished work. Closed historical data still requires the existing disable confirmation. Reactivation needs a current trial/verified license.

Overview now separately shows **Recorded cash this month** for completed cash tickets with recorded cash covering the total; gross completed totals (including unpaid) appear explicitly labelled. Unpaid completed tickets do not contribute to recorded cash. This is manually recorded cash, not provider-settled revenue or a refund/settlement ledger.

## Files and database dependencies

| Area                    | Main Phase B files                                                                                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain/read/write rules | `src/lib/business-modules.ts`, `system-services.ts`, `subscription-policy.ts`, `auth.ts`, `dashboard-navigation.ts`, `dashboard-load-plan.ts`                                                       |
| Persistence/policies    | `src/db/schema.ts`, `drizzle/0008_permanent_free_core.sql`, `drizzle/meta/0008_snapshot.json`, migration journal; local updates to `supabase/policies.sql` and Phase A `supabase/storage-quota.sql` |
| Server enforcement      | `src/server/module-service.ts`, `module-actions.ts`, `onboarding-actions.ts`, `queries.ts`, `actions.ts`, `order-service.ts`, `workspace-service.ts`                                                |
| UI/export               | Dashboard/sidebar, existing onboarding/picker/store/banner/billing, overview stats, POS restriction notice, Company Storage copy, `/dashboard/export` (now includes module trials)                  |
| Regressions/docs        | Module database, product, order, storage, workspace/cash, service presentation, action/performance tests; README, subscriptions and POS docs; this report                                           |

Phase B adds **0008_permanent_free_core**: one table (28 application tables total after all phases), two module-definition fields, one service-entitlement verification field, constraints, immutable trial/RLS/initialization logic and read/write SQL helpers. It enables all six Free Core configuration rows on existing companies and removes obsolete free-tool keys from incomplete onboarding selections. It preserves content, paid-license provenance, trial dates, claims, design entitlements, operational records and existing URLs. No dependency package was added by Phase B; Phase A's Sharp dependency is preserved.

Exact ordered dependencies (0000?0004 must already match the repository):

1. **0005_multi_industry_foundation** ? business types, module definitions/configuration/licenses, legacy editor compatibility and authorization helpers (25 tables).
2. **0006_system_services_onboarding** ? resumable wizard/company onboarding fields and original progress behavior (still 25 tables).
3. **0007_company_storage_quota** ? Phase A reservations and separately verified Storage entitlement (27 tables). Requires matching `supabase/storage-quota.sql` functions/triggers/restrictive policies and server-only `SUPABASE_STORAGE_SERVICE_KEY`; image processing/upload route changes must roll out together.
4. **0008_permanent_free_core** ? explicit module trials, policy metadata, verified service periods and Free Core/read/write rules (28 tables).
5. Apply this release's **`supabase/policies.sql` plus rendered `supabase/storage-quota.sql` together**, then register the existing deployed component catalog. Current `scripts/migrate.ts` already performs this order after all pending numbered migrations. These supplemental changes are part of the release dependency even though they are not another numbered migration.

The current migration command applies **all pending migrations through 0008**, then supplemental policies/catalog; it does not target only 0005/0006. Do not use it blindly for the separate production repair.

## Production mismatch and approved rollout order

Reported production `dashboard.load / modules / 42P01` means an undefined relation was encountered; logs alone do not identify the exact absent table or prove the migration journal state. Production schema/journal/environment were **not queried in this phase**. Earlier reports suggest missing 0005/0006; verify against the actual production database before choosing the separate repair artifact. This release continues to fail visibly if its module schema is missing.

1. Separately verify production project/connection, migration hashes/journal, missing objects and compatible deployed code. Resolve the known mismatch using an explicitly reviewed, appropriately scoped artifact; do not deploy this working tree as a workaround.
2. Review the Phase A+B diff, original module configuration/legacy licenses, SQL roles/Storage privileges and restore backup; take the normal database backup and retain pre-rollout configuration/provenance for comparison. Inventory unknown Storage object sizes without deleting or rewriting assets.
3. On a non-production Supabase staging project, configure the server-only Storage key and matching Auth/runtime settings. Apply the ordered dependencies and policy/catalog bundle above. The existing migration workflow is intended for the full reviewed release, not the narrow repair. There is no automatic migration build/deploy hook.
4. Validate schema/constraints/triggers/RLS/catalog/actual Storage sizes and trial/license states against this artifact. Exercise expired Core editing/publishing/upload/delete, active trial selection, expiry and unfinished tickets, tenant/role denials, direct Storage mutation denial, public image/site reads and real two-device checkout.
5. Only after separate approval, schedule coordinated database/policy + application rollout. Old direct browser uploads are incompatible with Phase A restrictive policies; new code requires 0007/0008 and the Storage key. Apply migrations/policies/catalog and verify before enabling the matching application. Avoid an uncontrolled mixed-version interval; do not run seeds or reset records.
6. Check production error references, Auth sessions, public pages/images, tenant scope, quota and new-vs-retained order behavior. Do not accept deployment until the missing-relation error is resolved and the hosted acceptance checks pass.

## Rollback

Preserve the additive schema, trial rows, claims, entitlements, Storage objects, order events and migration journal. Do not delete tables/data or remove journal entries. Retain the quota guards with matching server upload code/key. Prefer a reviewed forward correction; retain the pre-rollout application/policy artifacts and configuration backup for incident response.

A simple rollback to Phase A would restore obsolete blanket subscription gates and potentially different paid-license interpretation; restoring only older permissive Storage policies could weaken quota enforcement. Coordinate code/policies and pause new paid operations if needed while restoring a reviewed compatible authorization bundle. Do not manufacture fresh trials or automatically mark historic licenses verified to resolve an incident. Module configuration restoration, if required, must use the reviewed pre-rollout values while preserving all records.

## Local verification

Final checks ran sequentially against the completed local implementation:

| Check                                                             | Result                                                                                                                                                         |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run test -- --silent --maxWorkers=2 --testTimeout=30000` | Passed, exit 0: **37 files / 254 tests**, 28.62 seconds. Phase A baseline was 37 files / 246 tests; eight additional cases plus expanded existing regressions. |
| `npm.cmd run typecheck`                                           | Passed, exit 0 (`tsc --noEmit`).                                                                                                                               |
| `npm.cmd run lint`                                                | Passed, exit 0 (`eslint .`).                                                                                                                                   |
| `npm.cmd run build`                                               | Passed, exit 0: optimized compilation, TypeScript and static generation **11/11**, existing routes plus Phase A media API preserved.                           |
| `git diff --check`                                                | Passed; no whitespace errors.                                                                                                                                  |

The pre-existing Vitest CommonJS/ESM future config-loader warning remains non-fatal. Approved subprocess execution was used for local tests/build; no deployment or production access was part of these commands. Intermediate regressions exposed old subscription-policy assertions and a parameter-type error in a new disposable cash-report fixture; these were corrected before the successful full final run.

Tests run with disposable PGlite databases and mocked/stubbed Supabase Auth/Storage host contracts. They cover real migrations/triggers/RLS and authorization, fresh signup/trial claims, all implemented trial services, zero paid-license creation, expiry, permanent Core editing/multi-page publishing/one property, design ownership, quotas/deletion after expiry, dependencies, tenant/role isolation, existing merchant/legacy provenance, no automatic billing, verified-period requirements, exact retry reconciliation and retained fulfillment. These are not hosted service or production load tests.

## Known limits

- No payment provider, checkout, paid license issuing UI, subscription activation, refund/settlement ledger or custom-domain flow. Prices are illustrative. Verified entitlements require a future trusted/audited issuer; this phase only validates their authorization contract.
- Existing broad `legacy_editor` permissions remain for compatibility. No employee invitations, role editor, active-company switcher, additional industry engine or account-management subsystem was added.
- Expired services remain configured/readable with a History label; disabled services require valid authorization to reactivate. Safe fulfillment applies only to existing durable tickets, not new carts or unpaid settlement edits.
- Browser trial/license/quota presentation is a snapshot and may need refresh; server time/rows enforce each operation. Polling and the latest-50 closed-history window remain unchanged.
- Storage objects are public marketing media. Storage/SQL are not atomic; Phase A retry/reservation/reconciliation safeguards remain, as do stale references when deleting an image used by a page/product. No files are automatically deleted at expiry.
- Physical devices, hosted Auth/email, live Storage, production migration acceptance and production performance remain unverified. No production fix or deployment is claimed.
