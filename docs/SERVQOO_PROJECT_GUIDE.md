# SERVQOO Project Guide

Verified against the working tree on 17 November 2026. Package version: **0.2.3**. This includes local Phase A/B/C implementation; it does not establish what is deployed or migrated in production.

This is the primary maintained documentation entry point. Executable source, migrations and supplemental policies govern actual behavior. See the [deployment runbook](../DEPLOYMENT.md), [public/domain preparation](PUBLIC-GO-LIVE.md), [cleanup report](SERVQOO_CLEANUP_REPORT.md) and [historical archive](archive/README.md).

**Production boundary:** the reported `dashboard.load/modules/42P01` is unresolved here. Missing 0005/0006 has been suspected, not verified against the live journal. No production database inspection, migration, reset or deployment was performed. Do not bypass authorization/module queries or deploy against an unmigrated database.

## 1. Product Vision

SERVQOO is a modular small-business workspace: a permanently free company website and basic management tools, with optional operational System Services. The current operational scope is product pickup POS and a staff/kitchen queue. Website/catalog support across business categories does not imply salon booking or custom cake production exists.

One account normally starts one trial company. Membership architecture supports future staff/company features. Public marketing needs no account; company management requires authenticated, authorized access.

## 2. Current Technology Stack

Versions below come from `package.json`, not latest-release assumptions.

| Layer             | Current implementation                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Runtime/framework | Node 22.x; Next.js 16.4.6 App Router, Server Actions, route handlers, `src/proxy.ts`                   |
| UI                | React/React DOM 19.3.1; strict TypeScript 6.0.3; Tailwind/PostCSS 4.3.5 plus scoped CSS; Lucide 1.71.0 |
| Database          | PostgreSQL; Drizzle ORM 0.45.4; Postgres.js 4.1.0; Drizzle Kit 0.31.11                                 |
| Identity/media    | Supabase JS 2.119.0; SSR 0.12.7; Sharp 0.35.5 for server image validation                              |
| Editor/validation | dnd-kit core/sortable/utilities; Zod 4.6.7                                                             |
| Tests/tooling     | Vitest 5.1.0; PGlite 0.5.16; ESLint 9.39.5; Prettier 3.9.10; tsx                                       |
| Hosting target    | Vercel; actual deployment/environment remain external audit items                                      |

The internal package name remains `servqo`. Preserve the lockfile; cleanup does not reset dependencies.

## 3. Current Architecture

| Location                                          | Responsibility                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/app`                                         | Public marketing/legal, Auth, protected Dashboard/admin, APIs and published merchant sites    |
| `src/components/marketing`                        | Public shell, renderer demo, centralized pricing and disabled purchase summary                |
| `src/components/dashboard`                        | Shared workspace, onboarding, menu/business/media/module/billing UI                           |
| `src/components/editor`, `src/components/website` | Visual editor, trusted versioned registry, current and legacy renderers                       |
| `src/components/operations`                       | POS/cart, staff tickets, lifecycle, polling, fullscreen and per-tab drafts                    |
| `src/server`, `src/lib`                           | Authorized services/actions/loaders; schemas, capabilities, access/pricing/config/diagnostics |
| `src/db`, `drizzle`, `supabase`                   | ORM/pool, immutable migrations, supplemental RLS/Storage SQL                                  |
| `scripts`, `tests`, `public`                      | Controlled tools, regression fixtures, worker/logo/licensed starter assets/fonts              |

`loadMerchantContext` loads identity/membership/company/module/subscription context. `dashboardLoadPlan` selects per-view data: POS/menu use products/categories; Orders uses its API; editor reads layouts/design metadata/ownership and authorized media; settings/module management use lightweight context. Overview still reads builder data for its website snapshot. The client Dashboard remains shared, not a separate application per industry.

Public marketing routes are `/`, `/pricing`, `/demo`, `/purchase`, `/contact` and five `/legal/[document]` drafts, with robots/sitemap. Merchant publications use `/sites/[slug]/[[...path]]`. Protected `/dashboard`, module catch-all routes, `/dashboard/export`, `/admin`, `/api/orders` and `/api/media` retain independent guards. Old store/gallery/category aliases remain compatibility routes.

## 4. Authentication and Company Model

Supabase email/password signup, verification, sign-in, local-scope sign-out and recovery are implemented. Server `getUser()` validates identity; membership/capabilities are separate. Proxy refresh covers Dashboard/admin/orders API sessions, not every authorization boundary.

Journey: landing -> signup -> email verification -> Business Details -> Business Type -> System Services -> Trial Review -> Dashboard. Missing membership returns onboarding. The staged first save transaction creates profile/company, owner membership, trial claim, website/private homepage and starter categories. Progress persists and retries are idempotent. Completed companies skip setup. No automatic publication occurs.

Confirmation supports PKCE exchange and POST token-hash activation, then `/auth/confirmed`. Recovery uses `/auth/recovery` -> `/reset-password`. Preserve callback paths, safe local destinations and no-store/no-referrer behavior. Hosted allowlists, templates/delivery and actual device sessions need external acceptance.

| Role                   | Current boundary                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------- |
| owner                  | All company capabilities, including module configuration/export                     |
| manager, legacy_editor | Broad existing operations/builder/reporting; no owner module configuration          |
| editor                 | Website/media editing and design use, workspace/business read; no POS/report/export |
| cashier                | POS and basic workspace/business/catalog read; no catalog writes or website/export  |
| kitchen                | Staff orders read/manage and basic workspace/business read                          |
| technician             | Basic workspace/business read; no booking engine implied                            |
| unknown                | No capabilities                                                                     |

Platform admin is a separate profile guard. Migration 0005 preserves previous editor access as `legacy_editor`; new `editor` is narrower. No invitations, role editor or company switcher exists. Multiple memberships are possible, but the loader selects an existing membership without an active-company choice. Each device signs in independently; local sign-out does not terminate all other devices.

## 5. Database Tables and Relationships

`src/db/schema.ts` declares **28 application tables**. Provider-owned Auth/Storage tables are additional. Local schema/test success is not live migration evidence.

| Table                           | Purpose/relationship                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `user_profiles`                 | Auth-subject identity/name/platform role; no application FK to `auth.users`          |
| `merchants`                     | Company root, unique slug, details/type, immutable trial dates and setup progress    |
| `merchant_users`                | Company/profile membership/role, unique company+user                                 |
| `websites`                      | One website property per company, unique merchant ID                                 |
| `pages`                         | Website path, draft/published JSONB and revision; tenant relationship                |
| `component_definitions`         | Deployed design key/category/premium/active metadata                                 |
| `component_versions`            | Component key/version/settings-schema registration                                   |
| `store_products`                | Illustrative website-design listings/prices, not menu items                          |
| `merchant_entitlements`         | Unique company/component design ownership/provenance                                 |
| `menu_categories`               | Company-scoped ordered categories                                                    |
| `menu_products`                 | Company/category products, integer MYR sen, image URL/availability/order; tenant FK  |
| `media_assets`                  | Company Storage path/URL/name metadata, not image bytes                              |
| `website_revisions`             | Company/page publication history                                                     |
| `page_sections`                 | Normalized draft projection with component/version and tenant-page FKs               |
| `subscription_plans`            | Base plan catalog, no gateway product IDs                                            |
| `merchant_subscriptions`        | Company base status and verified period fields                                       |
| `subscription_events`           | Append-only subscription audit events                                                |
| `merchant_trial_claims`         | Immutable one-trial claim per Auth subject                                           |
| `pos_order_counters`            | Company ticket numbering/counter lock, not browser-readable                          |
| `pos_orders`                    | Company ticket, request/fingerprint, status/version, cash/unpaid/cancellation fields |
| `pos_order_items`               | Company/order snapshots; no product FK so history survives catalog deletion          |
| `pos_order_events`              | Append-only company/order lifecycle audit trail                                      |
| `business_module_definitions`   | Availability, free/paid policy, trial eligibility, illustrative pricing              |
| `merchant_modules`              | Persistent company/module enabled configuration                                      |
| `business_module_entitlements`  | Separate company service provenance, verification and expiry                         |
| `media_upload_reservations`     | Private server-only byte/hash/path reservations                                      |
| `merchant_storage_entitlements` | Private server-only verified higher Storage allowance                                |
| `merchant_module_trials`        | Immutable dated authorization per company/eligible service module                    |

Company -> memberships; company -> website -> pages -> sections/revisions; company -> categories -> products; company -> media/modules/subscriptions/orders; order -> item snapshots/events. Composite tenant FKs protect critical associations. SQL functions/triggers/grants/policies are behavior beyond ORM definitions.

Naming debt: page `updatedAt` and trial-claim `claimedAt` map to `created_at` through existing helpers. Do not rename columns or rewrite history during cleanup.

## 6. Business Types and System Services

Types: `cafe`, `bakery`, `nail_salon`, `hair_salon`, `beauty_studio`, `other`. Marketing presents the first five; onboarding also accepts Other. Type changes affect recommendations/starter content, not authorization or an industry's operational engine.

Nine implemented module keys: `overview`, `business`, `settings`, `website`, `media`, `catalog`, `pos`, `fnb_orders`, `kitchen_queue`. Eighteen Coming Soon keys cover customers/employees/QR ordering/tables, custom cake workflows, appointments/services/staff/calendar/checkout, inventory/loyalty/multi-outlet/analytics. Discovery labels do not implement those domains.

Dependencies: media -> website; POS -> catalog; F&B Orders -> catalog; Kitchen Queue -> F&B Orders -> catalog. The commercial Orders offer bundles the last two and requires POS. Owner-only configuration is separate from licensing; no optional services is valid. Future/database-unavailable modules cannot activate. Dependency checks, record confirmation and active-ticket/cancellation resolution precede disabling; records are not deleted.

## 7. Permanent Free Core

Dashboard, basic company profile/settings/catalog, basic website editing/draft/publish, quota-limited media, discovery/billing and authorized export remain available after expiry. Six Core modules are mandatory/free. Authentication, capabilities, tenant scope, quotas, catalog validation and revision checks still apply.

One free website means one **property**, not one page. Existing pages/URLs remain. Premium component ownership is separate: preview does not permit saving/publishing an unowned design, even when hidden. Owned designs remain usable after expiry. New explicit demo **design unlocks** retain their separate base subscription gate; Core does not mint premium ownership.

No full account-administration system, custom-domain provisioning or unlimited storage is implied. Current input/layout/path limits remain; no one-page cap was introduced.

## 8. 14-Day Trial

Company creation initializes explicit `merchant_module_trials` for POS/F&B Orders/Kitchen with the original 14-day dates. Migration 0008 backfills unchanged dates, including expired windows. Triggers reject trial changes/invalid inserts. The durable per-Auth-subject claim prevents repeated self-service trials, not multiple human identities across separate Auth accounts.

Any compatible implemented trial-eligible service can be selected, including non-recommended product retail POS for salons. Login, retries, service/type changes and memberships do not reset dates. No card, automatic charge or automatic paid subscription exists.

After expiry, Core/sites/data remain; new paid operations need verified company service access. Enabled expired screens retain history/safe fulfillment; disabled screens remain denied until authorized reactivation. Browser countdowns are snapshots; server/database time and rows enforce access.

## 9. Module Entitlements and Proposed Pricing

`moduleAccess` governs starting operations; `moduleReadable` retains configured/available/dependency-valid reads/fulfillment. Capabilities remain independent. `merchantModuleState` uses SQL trial/license state, not client flags. Missing schema produces diagnostic errors, never default access.

Paid verification needs company/module `provider` or `admin` provenance, non-future `verified_at` and future `expires_at`. Old included/legacy rows remain provenance, not perpetual paid authorization. Base subscription activation alone does not license all services. No merchant-facing paid issuer exists.

| Offer                  | Proposed MYR/month/company | State                            |
| ---------------------- | -------------------------- | -------------------------------- |
| Free Core              | RM0                        | Implemented                      |
| Product POS            | RM29                       | Implemented, trial eligible      |
| Orders & Kitchen Queue | RM29                       | Implemented bundle, requires POS |
| Cake Pre-orders        | RM29                       | Coming Soon                      |
| Appointment Booking    | RM39                       | Coming Soon                      |
| Staff Scheduling       | RM19                       | Coming Soon                      |
| Advanced Inventory     | RM19                       | Coming Soon, discovery only      |

Values come from `service-pricing.ts`/`system-services.ts`. POS + Orders is **RM58**, not RM87. Kitchen Queue is not a third charge. Design prices remain separate illustrative USD figures; higher Storage requires its own entitlement.

Public purchase summaries are **Demo only**: scope, company licensing, proposed calendar-month UTC/clamped period, maintenance/support limits, manual renewal and draft cancellation/refund/retention terms. No payment/license/contract acceptance is created. Current-company proration is not calculated. Reviewed legal identity/policies and a verified, audited/idempotent issuer are prerequisites to collecting money.

## 10. Website Builder

Nineteen trusted deployed design keys cover nine section categories. Three current headers use version 3; other current designs generally use version 2. Old renderers/versions remain available for saved/published content. Never delete them based on current import frequency.

The editor manages section order/visibility/settings/content/images/colors and device previews. Locked designs can preview. Server transactions validate tenant/revision/active ownership, update JSON plus normalized sections, and record publication history. Publish requires the submitted layout to match its saved draft. Database catalog registration and executable registry must stay coordinated.

Public merchant sites render published layouts only; products/business details are shared live content and can change without republishing the layout. Ordering CTA is a WhatsApp/configured link, not online checkout. Page create/list/edit works; rename/delete/unpublish/history-restore UI and custom domains do not. Unsaved editor state survives navigation, not a full reload. Compatibility aliases redirect to the editor/menu.

## 11. POS and Orders

Categories/search/quantities build a counter-pickup bill with note and cash/unpaid choice. The server validates availability/prices, computes totals/change, snapshots items and writes ticket/counter/event atomically. Company/request UUID+fingerprint provides idempotency; exact committed retries reconcile after expiry, changed requests fail. Version/row locks protect lifecycle changes.

Pending -> preparing -> ready -> completed; only pending -> cancelled with reason. Cancellation acknowledgement is separate. Existing tickets can finish/cancel/ack after expiry, without item/payment/total edits. Active/unacknowledged work blocks service disabling.

Two independently authenticated devices share online POS/staff Orders. Sync is authenticated HTTP polling, not WebSockets or offline checkout. Active/unacknowledged tickets plus latest 50 closed tickets are returned; full history/search/pagination is absent. Fullscreen has a browser/fixed fallback. sessionStorage drafts are tab/company scoped, not cross-device carts.

Overview separates manually recorded completed cash from gross completed totals including unpaid orders. Neither is a reconciliation/refund ledger. Card/QR/e-wallet, settlement, tax/discounts, printers, inventory/modifiers, public customer display and salon service checkout are not implemented. Real hosted device/load acceptance remains pending.

## 12. Image Optimization

All application upload entry points use `image-upload.ts` and `public/image-worker.js`. JPEG/PNG/WebP originals can be up to 20 MiB; optimization avoids upscaling, targets a 1920px longest side, normally WebP quality 80 with quality fallbacks, and a final 2 MiB maximum. Existing transparency/orientation/small-logo handling remains. HEIC and executable SVG are rejected.

Sharp validates signatures/MIME, dimensions and full decoding on the server. Request limits differ from original client-file limits. Progress/retry IDs are merchant-scoped. No worker, limits or validation behavior changed during cleanup.

## 13. Company Storage Quotas

Central `storage-policy.ts`: **20 MiB free**, **50 MiB during original trial**, **100 MiB only with separate verified Storage entitlement**. SQL renders the same constants. Service licenses do not raise storage.

Actual object metadata plus pending reservations is counted under company locks, including orphans and excluding double-counted existing objects. Unknown legacy sizes fail closed. Uncertain uploads may reserve capacity until retry/operator review. Warnings occur at 80%, 95% and full.

Public `merchant-media` stores bytes under company UUID/generated names; SQL stores metadata. Confirmed deletion validates role/tenant and authoritative absence before SQL cleanup. Storage/SQL are not atomic; failures retain retryable records. Used image references are not rewritten. Expiry never deletes images: over-quota companies can delete, but cannot upload until capacity permits.

The server Storage key is privileged. Restrictive policies deny direct browser mutations; reservation/late-write guards enforce quota. Public reads remain intentional. Private accounting tables must not gain browser SELECT rights to satisfy obsolete diagnostic assumptions.

## 14. Current Feature Implementation Status

These classifications describe bounded source/test behavior, not hosted certification.

| Feature                                                 | Classification         | Boundary                                                                          |
| ------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| Auth/onboarding/Core/service access rules               | Implemented and tested | Hosted email/session settings remain external acceptance                          |
| Menu persistence; publishing/design gates               | Implemented and tested | Browser/hosted end-to-end coverage incomplete                                     |
| Image decoding/quota/reservation/deletion guards        | Implemented and tested | Real Storage/provider-trigger acceptance pending                                  |
| Pickup POS/lifecycle/idempotency/version checks         | Implemented and tested | No operational payments/hardware/offline engine                                   |
| Queue/fullscreen/polling/tab drafts                     | Partially implemented  | Real devices/load, full history and offline support absent                        |
| Staff capability definitions                            | Partially implemented  | No invitation/role-assignment administration                                      |
| Public marketing/pricing/demo/contact config            | Implemented and tested | Real channels/domain/social browsers unverified                                   |
| Public checkout/billing upgrade/design checkout         | Demo only              | Service checkout disabled; design demo grants free ownership, not paid provenance |
| Legal documents                                         | Partially implemented  | Drafts need operator details and human/legal review                               |
| Appointments/staff scheduling/custom cake pre-orders    | Coming Soon            | Disabled, no functional engines                                                   |
| Payments/refunds, customer display, stock, multi-outlet | Not implemented        | Planned labels are not working modules                                            |

## 15. Known Limitations

- Production `42P01` needs an audit against the actual runtime database/journal. Do not treat missing schema as a membership subscription to bypass.
- `scripts/check-database.ts` assumes every application table has a browser SELECT policy. The two private Storage accounting tables intentionally do not. It can report false-positive missing read policies and does not comprehensively check new quota/trial helper bodies. Update the diagnostic in a separate audit; never weaken RLS to silence it.
- Privileged SQL can bypass RLS; explicit authorization remains essential. Legacy editors retain broad access. Private-media and new staff permissions need review.
- Error handling is not uniformly structured across generic CRUD/provider paths. Recovery re-authentication/session administration and shared-terminal draft cleanup remain review items.
- Storage deletion can leave dangling content references; unknown sizes/reservations need reconciliation. No private customer-document bucket exists.
- No company/outlet selector, configurable currency/timezone, complete history/reporting or general industry transaction engine. Current operations use MYR/Malaysia.
- No append-only module-configuration ledger or verified billing issuer. Catalog metadata/version deployment must remain coordinated.
- Browser snapshots age; POS drafts are not explicitly cleared on shared-terminal sign-out. No offline outbox exists.
- Legal/contact/domain identity, hosted Auth, Storage, performance and actual devices remain unverified here. Archive test results are historical, not present production proof.

## 16. Environment Variables (Names and Purposes Only)

Use `.env.example`; store real configuration in ignored local files or provider secret settings. No credential values are included here.

| Name                                   | Purpose                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`                         | Secret server runtime PostgreSQL URI                                             |
| `MIGRATION_DATABASE_URL`               | Secret controlled direct/session tooling connection; never transaction port 6543 |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase API project URL                                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Preferred public API key                                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Legacy public-key alternative, never a privileged key                            |
| `NEXT_PUBLIC_APP_URL`                  | Actual Auth/application origin for callback construction                         |
| `SUPABASE_STORAGE_SERVICE_KEY`         | Secret server-only validated Storage operations, required for upload/delete      |
| `SEED_USER_ID`                         | Optional demo-seed Auth owner, unnecessary for normal signup                     |
| `SERVQOO_PUBLIC_ORIGIN`                | Optional verified HTTPS marketing canonical; safe HTTPS app-origin fallback      |
| `SERVQOO_REDIRECT_FROM_HOSTS`          | Optional verified old hosts; public-marketing redirects only, blank disables     |
| `SERVQOO_CONTACT_EMAIL`                | Confirmed public business email, invalid/blank hidden                            |
| `SERVQOO_WHATSAPP_NUMBER`              | Confirmed digits-only international contact, invalid/blank hidden                |
| `VERCEL_URL`, `VERCEL_ENV`, `NODE_ENV` | Platform settings for preview/Auth/indexing/development behavior                 |

Never paste secrets into docs/arguments/screenshots/logs. Production environment values were not read or rewritten in this task.

## 17. Local Development Instructions

Use Node 22.x and locked dependencies. On a fresh checkout:

```powershell
npm.cmd ci
Copy-Item -LiteralPath .env.example -Destination .env.local
npm.cmd run dev
```

Do not overwrite an existing `.env.local`. Configure a dedicated development Supabase project before Auth/company work. Public marketing is anonymous. Review the migration/policy workflow below for that deliberately selected development target; these instructions are not production authorization. Normal signup creates a private workspace; seed is optional demo data. Development HTTP can use the local origin fallback; production Auth requires HTTPS.

## 18. Database Migration Workflow

Migration SQL, journal and snapshots are immutable history. `scripts/migrate.ts` applies **all pending** numbered migrations, then base plus rendered quota policies together in a separate transaction, then catalog registration. It is not a 0005/0006-only repair. Later-stage failure may follow successful schema changes; inspect state instead of resetting tables/journal.

| Migration | Responsibility                                                               |
| --------- | ---------------------------------------------------------------------------- |
| 0000      | Initial company/builder/menu schema                                          |
| 0001      | Tenant indexes/composite relationships                                       |
| 0002      | Base subscription/trial/claims/events/guards                                 |
| 0003      | POS counters/tickets/snapshots/events/RLS                                    |
| 0004      | Header version-3 registration                                                |
| 0005      | Business types/modules and legacy role compatibility                         |
| 0006      | Resumable onboarding and proposed pricing metadata                           |
| 0007      | Private reservations and verified Storage allowance                          |
| 0008      | Permanent Core, explicit immutable module trials and verified service access |

Order: 0000-0004 as applicable -> **0005 -> 0006 -> 0007 -> 0008 -> matching `supabase/policies.sql` plus rendered `supabase/storage-quota.sql` -> deployed catalog**. Matching server key/upload code/policies must roll out together. Do not apply unrendered quota placeholders or generated schema alone.

Only for a separately reviewed, deliberately selected environment:

```powershell
npm.cmd run env:check
npm.cmd run db:check
# Writes the complete pending schema/policy/catalog bundle; review target/backup first.
npm.cmd run db:migrate
npm.cmd run db:check
```

Checkers contact the configured database/provider; none ran during cleanup. Interpret `db:check` with the private-table limitation above. Audit exact hashes, privileges, functions/triggers, constraints, catalog and quota behavior; an empty issues list is not comprehensive acceptance.

`db:catalog` writes missing deployed metadata. `db:seed` writes demo content and is not production repair. `scripts/reconcile-storage.ts` reports by default, but explicit `--release` mutates a reservation after absence checks; production use needs separate operator approval. Local read-only probes do not measure Vercel latency.

## 19. Deployment Requirements

Use the [deployment runbook](../DEPLOYMENT.md) and [public/domain runbook](PUBLIC-GO-LIVE.md). No deployment is automatic or performed here.

1. Verify actual production project/branch/runtime target/journal and separately resolve the missing relation using a reviewed artifact.
2. Stage backups/restore, full schema/policy/catalog bundle, Storage key and exact privileges. Do not deploy code before its schema or mix old direct uploads with new restrictive policies.
3. Keep Node 22, locked install and `npm run build`; database writes do not belong in build hooks. Separate preview secrets. Align functions with the actual database region and measure latency.
4. Verify Supabase Site URL, exact confirmation/recovery redirects and templates for the approved origin. Preserve PKCE/cookie behavior. A brand rename is not authorization to change Auth URLs.
5. Intended `servqoo.com` ownership/DNS/HTTPS remain unverified. Canonicals/alternate redirects and later Auth-origin changes follow the coordinated runbook. No Resend/SMTP integration is added.
6. Accept hosted new/existing users, expired Core editing/publishing, premium gates, quota/upload/delete, two-device lifecycle, export and cross-tenant/role denials. Confirm legal/contact content before marketing and leave checkout disabled until separately reviewed commerce exists.

Rollback preserves additive schema/data/claims, renderer versions and Storage enforcement. Do not reset trials or revert policies alone. Old code may restore obsolete gates or permissive Storage behavior; prefer a compatible reviewed forward correction. Cleanup readiness is not production approval.

## 20. Testing Instructions

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --silent --maxWorkers=2 --testTimeout=30000
npm.cmd run build
git diff --check
```

Pre/post results are in the [cleanup report](SERVQOO_CLEANUP_REPORT.md). Current suite: **38 files / 271 tests**. Tests use mocked Auth/Storage or real disposable PGlite SQL/services with provider host stubs. They do not prove live email, Storage, pooler/load/device or production state. The existing Vitest loader warning is non-fatal; no tests were disabled.

Optional loopback tools: `scripts/design-fixtures.tsx` renders real sections; `scripts/check-designs.ts` expects browser DevTools and a generated gallery bundle. `scripts/gallery-fixture.tsx`, gallery components and ignored `.design-qa/gallery.js` are workflow dependencies, despite no production gallery navigation. Fresh-checkout browser automation is not fully self-contained. QA screenshots are historical artifacts, not current acceptance.

## 21. Security Considerations

Keep server identity/capability/tenant predicates, compound relationships and action checks. Privileged runtime SQL may bypass RLS. Browser writes are revoked; reads require intended membership/capability/module policies. Private accounting tables deliberately have no browser SELECT.

Never expose the Storage key or database URI as public configuration. `.env.local` is ignored and not tracked in the inspected index; this is not a complete Git-history secret scan or security certification. Marketing contact values are intentionally public, not credentials.

Keep byte decoding, generated company paths, quotas and absence guards. Public images are not private documents. Purchase acknowledgement cannot mint billing access. Immutable claims/events and authorization must not be removed for convenience.

Retain compatible `servqo` names: package/CSS/component identifiers, logo source/paths, export filename, real existing URLs, immutable migration/plan data and stable design keys. Runtime plan display normalizes old branding. Current brand copy is SERVQOO; frozen historical wording is unchanged.

## 22. Future Development Roadmap

1. Final deployment audit: migration mismatch, diagnostic assumptions, Storage/private privileges, hosted latency, email and devices.
2. Reviewed identity/legal/contact/domain content and repeatable hosted/browser/load checks before commerce.
3. Managed staff invitations/roles, shared-terminal behavior, active-company/outlet/currency/timezone contracts and configuration audit history.
4. A focused bakery production OR salon services/resources/booking domain; do not encode appointments as POS tickets.
5. Trusted payments/ledger/webhooks, exact periods/renewals, refunds/cancellation/reconciliation before charging; preserve demo provenance.
6. Expanded history/reporting, stock/modifiers/printers/customer display only with explicit scope and acceptance. Planned labels remain unavailable until implemented.
