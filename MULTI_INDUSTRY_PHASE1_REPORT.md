# SERVQO Multi-Industry Foundation — Phase 1 Report

17 November 2026. Baseline: 22 application tables, 30 test files / 175 tests. Implementation is local and requires pending migration 0005; nothing was deployed or externally migrated.

## Delivered

- Six validated business types selectable during onboarding; existing merchants default to café. Owners can change recommendations without resetting enabled modules/content.
- Central registry: nine existing implemented modules, eighteen explicitly coming-soon modules, dependency/capability/license/subscription metadata and demo-only discovery pricing.
- Separate persistent business module configuration and licensing. Existing website design entitlements and demo unlocks are unchanged.
- Shared module-aware sidebar, existing route compatibility, neutral Website Builder label, basic Store > Business Modules discovery and owner enable/disable controls for implemented optional licensed modules.
- Explicit role foundation: owner/manager/new editor/cashier/kitchen/technician and compatibility-preserving legacy editor. No employee management or assignment UI is claimed.
- Server module checks in `authorize`, route loaders, POS/orders API and actions; dedicated report/export capabilities. Browser content/storage policies tightened in the pending rollout.
- Lightweight shared merchant context and per-view data plans. Orders/settings no longer load builder/media/catalog content; POS loads only products/categories beyond shared context. Existing unsaved website layouts/unload warnings and tab POS drafts are preserved.
- Completed-order dashboard total label clarifies reporting semantics. Cash/unpaid order behavior and the legal status lifecycle are unchanged.
- Defensive media deletion verification handles confirmed missing-object SDK responses and rejects ambiguous failures.

## Existing features reused

Supabase Auth/session/callbacks, Drizzle transactions and tenant relationships, onboarding/trial initialization, existing sidebar/dashboard design, menu product editor, storage/media UI, reusable website renderer and all legacy versions, editor draft/publish/design ownership, POS item snapshots/counter/idempotency, orders queue/cancellation history, verified subscription gates, safe timing references and JSON export.

The original audit's media warning required a nuance: inspection of the installed Storage SDK shows `exists()` can return `data:false` together with a confirmed `NoSuchKey`/legacy-404 error, and normally throws other lookup failures. The defensive handling and regression test preserve known absence while rejecting ambiguous returned errors; simply rejecting every `error` would break real deletion. This does not establish that a live bucket deletion was exercised.

## Changed files

| Area                   | Files                                                                                                                                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business/module domain | New `src/lib/business-modules.ts`, `business-defaults.ts`, `dashboard-load-plan.ts`; updated `merchant-capabilities.ts`, `dashboard-navigation.ts`, `auth.ts`, `workspace-errors.ts`                                                                                 |
| Data / migrations      | `src/db/schema.ts`; new `drizzle/0005_multi_industry_foundation.sql`, `drizzle/meta/0005_snapshot.json`; updated migration journal and `supabase/policies.sql`                                                                                                       |
| Server services        | New `src/server/module-service.ts`, `module-actions.ts`; updated `queries.ts`, `actions.ts`, `workspace-service.ts`, `order-service.ts`, `order-actions.ts`                                                                                                          |
| Dashboard UI           | New `src/components/dashboard/module-store.tsx`; updated `dashboard.tsx`, `dashboard-screen.tsx`, `sidebar.tsx`, `workspace-onboarding.tsx`, `workspace-state.tsx`, `menu-manager.tsx`, `overview-stats.tsx`; scoped additions to `src/app/dashboard-navigation.css` |
| Routes / API           | `src/app/dashboard/[...module]/page.tsx`, `src/app/dashboard/export/route.ts`, `src/app/api/orders/route.ts`; `src/components/operations/pos-screen.tsx` recognizes definite module rejection                                                                        |
| Tests                  | New `tests/business-modules.test.ts`, `modules-database.test.ts`; updated database table-count, onboarding per-view expectations, default type, export permission, media response handling and orders API tests                                                      |
| Documentation          | New `MULTI_INDUSTRY_ARCHITECTURE.md`, this report                                                                                                                                                                                                                    |

The existing `package.json` change and untracked audit report were preserved. No new dependency, component key, payment gateway or public booking/pre-order route was added. Ignored local QA helpers/screenshots are not production source.

## Database and security review required before deployment

Pending: migration **0005_multi_industry_foundation**, plus updated supplemental policies applied by the existing migration command. It adds `merchants.business_type` and three module tables (25 total), registry rows, included/legacy licenses, module initialization trigger, checked business types and SQL capability/module helpers.

Existing editor membership rows explicitly become `legacy_editor` to preserve previously delivered access. New `editor` assignments are narrower; no current user becomes owner/manager/cashier/kitchen automatically. Module configuration is owner-only and never grants a missing license. Coming-soon modules cannot activate, even if an untrusted client calls the action directly. Core modules cannot be switched off through the action. Disabling a module preserves all its records; dependent modules must be disabled first.

See the architecture document's deployment sequence. **No production migration, seed, catalog command or external data mutation was run.** The new code must not be deployed against an unmigrated database. SQL role/storage/read-policy changes require review and staging acceptance; tests do not replace this review.

## Navigation and Store behavior

- Existing café routes remain, including POS/Orders/Menu/Builder/Media/Billing. Old categories/store design links redirect to their supported destinations.
- `/dashboard/store/modules` discovers all registered modules, shows effective status/recommendations and permits owner configuration where supported/licensed. It is functional configuration after migration, not a real purchasing service.
- Website Designs links into the existing editor rather than pretending a standalone design checkout exists. Design unlocks still explicitly grant demo ownership with no payment.
- Bakery/salon planned tools appear as disabled coming-soon entries. Default salon navigation does not expose the product POS as salon checkout. Owners may explicitly enable product pickup POS for retail use; that does not add services/appointments.
- Disabled/expired/unlicensed modules are removed from working navigation and denied by server checks. Existing data remains in the database/export; public published sites are not unpublished when an admin module is disabled.

## Quality results

Final checks ran against the completed implementation on 17 November 2026. No actual two-device, hosted login/email, live storage deletion or production migration acceptance is inferred from unit/PGlite/UI-preview tests.

- `npm.cmd run typecheck`: passed, exit 0 (`tsc --noEmit`).
- `npm.cmd run lint`: passed, exit 0 (`eslint .`).
- `npm.cmd run test -- --silent`: passed, exit 0; **32 test files / 201 tests**, final reported duration **29.96 seconds**. The 175 baseline tests remain, with expectations updated for additive table count, explicit default business type, restricted export permission and per-view loading. Twenty-six additional regression cases were added.
- `npm.cmd run build`: passed, exit 0; optimized compilation, TypeScript and static generation **10/10** completed; existing route table preserved with new module paths resolved through the existing dashboard catch-all.
- Isolated browser preview: passed cafe/bakery/hair-salon discovery at 1440px and 390px; no horizontal overflow; planned module activation buttons disabled; salon lacked default POS link; onboarding offered six types; no uncaught browser exceptions. Mutations and navigation were stubbed in this preview.

The pre-existing Vitest configuration-loader compatibility warning remains non-fatal. Initial local tool attempts encountered sandbox subprocess `EPERM`; successful retries used approved local compiler/test subprocess access. `git diff --check` passed. No new dependency or production build/deploy hook applies migrations.

Database tests use real migrations, RLS, triggers and services on disposable PGlite, with Supabase Auth/Storage host schemas mocked/stubbed. They cover legacy café/editor migration, published content/design entitlement preservation, salon defaults, actual authorization helper boundaries, configuration/expiry/dependencies, browser policy writes/reads/storage, tenant isolation, existing order creation/idempotency and per-view loading. They do not exercise hosted Supavisor concurrency or real payment contracts.

## Known limitations and Phase 2

- Employee invitations/role assignment remain future work. `legacy_editor` retains broad historic privileges until owners approve a transition; this is compatibility, not final least privilege for those existing users.
- Business type does not provide an industry engine. New salon starter sections reuse current components; service/staff/booking and cake pre-order adapters are design only. Newly created additional pages still use the existing starter layout helper.
- Module prices are examples; no module purchase, recurring billing, provider license issuance or ledger is implemented. Included licenses still depend on existing base subscription write rules.
- SQL helper role/dependency rules and TypeScript definitions require coordinated updates. Configuration/license history has no new append-only audit-event table in this foundation.
- Membership selection still chooses an existing membership; there is no merchant/outlet switcher. Currency/timezone remain MYR/Malaysia for operational totals.
- The dashboard remains a shared client component. Overview still reads builder data for the preserved snapshot. Route-level dataset selection is incremental, not complete UI/server decomposition.
- Polling, the latest-50 closed ticket window, no offline order engine, no service-payment checkout, no refunds/settlement ledger and existing expiry rules for preparing/completing tickets remain.
- Stored POS drafts are tab/merchant scoped as before. Shared-terminal sign-out cleanup remains a separate policy/task.
- Storage is public and cannot share a transaction with metadata; appropriately authorized direct Storage operations can still leave stale metadata/references. References are not rewritten when an image is deleted.
- Completed gross order totals include unpaid completed tickets. No collected/net revenue is claimed.

Phase 2 should validate the staged/production rollout and actual devices first, add managed employee invitations/least-privilege assignment, expand committed browser/load coverage, and then choose a focused domain: bakery scheduled/custom orders or salon service/appointment scheduling. Build payments and allocations as a separate ledger when a gateway is approved. Do not put appointment state into `pos_orders`.

## Requested outcome summary

1. Foundation, module discovery/configuration, role/module enforcement and selective loading are implemented locally.
2. Design unlock/payment previews, subscription upgrade and future module prices remain demo-only; planned operational modules remain unavailable.
3. Migration 0005 and supplemental policies are pending external approval/application and staging acceptance.
4. Existing café lifecycle/design/content behavior is preserved in regression tests; hosted acceptance remains unverified.
5. New merchants can select business type once the coordinated migration/code rollout is complete.
6. Owners can independently enable/disable implemented optional licensed modules, respecting dependencies/subscription rules; cannot activate future modules or disable core ones.
7. Store is discovery plus supported module configuration, not real commerce. Website design discovery still uses the editor.
8. Phase 2 should deliver rollout acceptance and employee permissions administration before a new bakery/booking domain.
