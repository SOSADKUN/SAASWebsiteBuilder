# SERVQO Phase 1.5 — Onboarding and System Services

17 November 2026. Implemented locally on the Phase 1 foundation. No production migration, external database mutation, seed, deployment or payment was performed. Package version remains 0.2.2.

## 1. User onboarding journey

Supabase registration, confirmation and login are unchanged. A signed-in user without a merchant sees the branded four-step setup:

1. **Business details:** owner/display name, business name and validated website slug. Saving creates the existing merchant, owner membership, website/homepage and real trial atomically. Optional modules start disabled.
2. **Business type:** six existing types, presented as cards. Saving sets recommendations and starter homepage draft; it does not create a booking or custom-order engine.
3. **System Services:** choose recommended implemented services, deselect unwanted services or view all compatible services. Each accepted selection is saved to the database without activating it.
4. **Review:** actual trial expiry in Malaysia time, remaining days, RM0 due now and proposed monthly total. Completion revalidates licenses/dependencies/subscription and activates the saved selection atomically before entering Dashboard.

Progress after the first successful details save survives reload, sign-in and interruption. Unsubmitted initial text is not stored. Back navigation supports edits. New setup submission retries serialize on the authenticated profile and return the existing claimed merchant; completion retries are idempotent. Neither retry nor service changes restart the immutable trial.

Existing merchants default to `complete` and skip setup, retaining enabled modules and content. The older direct creation actions remain compatible with Phase 1 defaults; the normal new-user UI uses the staged flow. Pending setup deep links resume onboarding rather than failing because their optional module is not enabled. Non-owner members of an incomplete business are told to ask the owner to finish.

## 2. System Services selection

The wizard and post-onboarding management share `SystemServicePicker` and the service domain helpers. Cards distinguish Included, demo-priced trial-eligible services and Coming Soon. Selected services remain visible; View All reveals other compatible services. Future, database-unavailable and unlicensed services cannot be activated.

Orders & Kitchen Queue is one commercial offer covering the existing `fnb_orders` and `kitchen_queue` modules. Its order source is Product POS, which requires Product / Menu Catalog. Selecting Orders adds its prerequisites; removing a required source is blocked until dependent services are removed. Media requires Website Builder. Server validation independently enforces these rules.

All implemented services may be explicitly selected by any business type for hybrid retail use; recommendations differ. Product POS remains a pickup-product checkout, not salon service checkout. Historical Phase 1 queues without POS remain readable; new activation and source removal enforce the POS dependency.

Users can complete with no paid services, including no optional services at all. Core overview/business/settings remain. Disabling a service with relevant saved pages, products, media or orders requires a native confirmation dialog. Cancelling keeps it enabled; confirming changes configuration only. Reactivation restores access to retained data, subject to permissions, licenses and subscription. Published websites are not automatically unpublished by disabling their administration module.

## 3. Sidebar

The dedicated **SYSTEM SERVICES** group shows enabled, licensed and capability-accessible POS/Orders links. The owner-only **[+] Add System Services** action opens the existing `/dashboard/store/modules` destination, now labelled System Services. Empty operational selections have an explanatory empty state. Builder/maintenance/settings links retain their groups and access filtering. Coming-soon services are discoverable in management instead of appearing as operational sidebar links.

## 4. Pricing configuration

`src/lib/service-pricing.ts` is the central proposed pricing map. Amounts are integer MYR sen, formatted consistently by service helpers. Database definition pricing metadata is aligned by migration 0006.

| Offer | Proposed monthly price | Availability |
| --- | --- | --- |
| Website Builder, Media, Product / Menu Catalog | RM0 / Included | Implemented; existing write guards apply |
| Product POS / Cashier | RM29 | Implemented |
| Orders & Kitchen Queue | RM29 | Implemented bundle |
| Cake Pre-orders | RM29 | Coming Soon |
| Appointment Booking | RM39 | Coming Soon |
| Staff Scheduling | RM19 | Coming Soon |
| Advanced Inventory | RM19 | Coming Soon |
| Other planned services | To be announced | Coming Soon |

POS plus Orders totals **RM58/month**, not RM87: Kitchen Queue is not charged separately. Duplicate selections do not double-count. Future services cannot enter a valid selection. Prices are illustrative service totals, not an activated recurring plan, a base subscription quote, taxes or an invoice. Existing website design purchases/demo entitlements and their separate pricing are unchanged.

**Free Plan boundary:** RM0/Included means no proposed additional service fee. It does not create permanent free editing rights. Current base trial/subscription guards remain on website, menu, media and operational writes. After expiry, these still need the existing valid subscription. A permanent Free Plan requires a separately approved access model and aligned SQL/storage policies; this task deliberately does not bypass those protections.

## 5. Trial banner

The compact dashboard banner shows real expiry, days remaining, selected paid services and projected total, with no automatic-charge wording. It has normal trial, near-expiry (three days or less) and expired states. Verified active subscriptions hide it. Management/subscription actions respect capabilities. Display time advances from the server timestamp; every protected write still checks authoritative server access.

Expired workspaces preserve records and read/export behavior. Service configuration remains subject to the existing subscription guard. An interrupted expired onboarding can finish with a core-only selection; activating optional services requires valid access. No trial timestamp or claim is rewritten.

## 6. Entitlements, authorization and diagnostics

Configuration and licensing remain separate. Checkboxes never issue licenses or verified payment records. Server actions validate authenticated merchant membership, owner `modules:manage` capability, deployed implementation availability, actual entitlement/expiry, dependencies and base subscription. Missing licenses and forged future-service requests are rejected. Database-disabled implementations remain unavailable even if a client checks them.

Merchant locks serialize setup/configuration writes. The subscription helper now accepts the current transaction, avoiding a nested connection request during onboarding completion. Tenant predicates and existing authorization/RLS protection remain intact. New actions use safe error responses and correlated stage timings, without logging forms, emails, credentials, SQL or customer records.

## 7. Database changes and pending deployment

New **0006_system_services_onboarding.sql** adds two merchant fields:

- `onboarding_step`, checked and defaulting to `complete` for compatibility.
- `onboarding_services`, a JSONB saved selection draft.

It also updates module-definition demo pricing metadata only. No new application tables: the Phase 1 total stays **25**. No business records are deleted; licenses, availability and subscription/trial dates are not changed by 0006.

The migration, snapshot and journal are local. The external application status of Phase 1 migration **0005_multi_industry_foundation** is unverified; 0006 requires that foundation. Do not deploy this code against an unmigrated database.

An authorized operator should review/back up and stage the coordinated rollout: apply any pending 0005, then 0006, together with the existing supplemental policies/catalog responsibilities through the established migration workflow (`npm.cmd run db:migrate`), and deploy compatible code. Verify existing merchants, fresh setup and restricted roles before production acceptance. No migration command was executed here, and build/deployment does not automatically apply migrations. No seed/reset is required.

## 8. Changed files

| Area | Files |
| --- | --- |
| Service domain/pricing | New `src/lib/service-pricing.ts`, `system-services.ts`; updated `business-modules.ts`, `dashboard-navigation.ts`, `subscription-service.ts` |
| Persistence | Updated `src/db/schema.ts`, `drizzle/meta/_journal.json`; new migration 0006 and `drizzle/meta/0006_snapshot.json` |
| Server | New `src/server/onboarding-actions.ts`; updated `actions.ts`, `module-actions.ts`, `module-service.ts`, `queries.ts` |
| Onboarding/services UI | Replaced `workspace-onboarding.tsx`, `module-store.tsx`; new `system-service-picker.tsx`, `trial-banner.tsx` in `src/components/dashboard` |
| Dashboard integration | Updated `dashboard-screen.tsx`, `dashboard.tsx`, `sidebar.tsx`; new `src/app/system-services.css`, imported by `globals.css` |
| Regression tests | New `tests/system-services.test.tsx`; expanded `modules-database.test.ts`; updated `business-modules.test.ts`, `navigation.test.tsx` |
| Documentation | This report |

No dependency, login redesign, website renderer/editor redesign, payment gateway, appointment workflow or cake-order workflow was introduced. Ignored local browser-preview scripts/screenshots are QA aids, not production source.

## 9. Verification

Final checks on 17 November 2026:

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed: `tsc --noEmit` |
| `npm.cmd run lint` | Passed: `eslint .` |
| `npm.cmd run test -- --silent` | Passed: **33 files, 220 tests**, 27.84 seconds |
| `npm.cmd run build` | Passed: optimized compilation, TypeScript and static generation 10/10; existing route table retained |
| `git diff --check` | Passed |

The 201-test Phase 1 baseline is retained with expectations adjusted for the deliberate navigation/dependency changes. Nineteen added cases cover staged creation and concurrent retries, saved selection/resume, business types/recommendations, optional/core-only completion, dependency and pricing calculations, expired trials/no reset, license rechecks, implementation availability, cross-tenant/non-owner rejection, disable-confirmation/data retention/reactivation, existing merchant compatibility, sidebar plus visibility and trial banner states.

Database integration uses real migrations/actions/authorization on disposable PGlite with Supabase identity/host-schema stubs. The initial expanded run exposed a transaction/connection issue during subscription lookup; using the existing transaction fixed it. The final full suite passed. Vitest retains its pre-existing non-fatal CommonJS/ESM configuration-loader warning.

An isolated headless Edge preview exercised actual UI components with **stubbed server actions** at 1440, 768, 390 and 320px: all setup steps and management had no horizontal overflow. It verified details before selection, recommendations, dependency blocking, persisted deselection, RM0 review, confirmed completion, future-service disabled controls, View All, sidebar plus, disable confirmation/cancel, restricted-role plus visibility and no uncaught UI exceptions. Screenshots were inspected. This does not verify hosted login, live storage, actual production latency or physical two-device acceptance.

## 10. Demo versus production limitations

No real charges, billing provider, recurring invoice, webhook, paid module license issuance or automatic renewal exists. Existing demo design unlocks remain explicit demo behavior. Planned operational domains stay disabled. Included licenses do not establish payment or permanent free access. Existing POS payment/history/polling limits and public media behavior remain unchanged.

No hosted database, live email/cookies, production migration state, physical devices or payment integration was validated in this task. Local compilation, PGlite integration and stubbed browser checks are separate evidence, not a production-readiness claim.

## 11. Before recurring billing

Approve the permanent free/base/module access contract first, including trial expiry during active operations. Choose a provider and implement trusted webhook-driven license/subscription issuance, idempotent purchase records, renewals/expiry, cancellation/refunds and reconciliation. Define tax/currency/pricing policy and preserve demo entitlement provenance. Align SQL and TypeScript policy helpers, stage migrations, then run hosted onboarding/role/storage and two-device operational acceptance. Employee invitation/role administration remains a separate next phase.

## 12. Direct answers

1. **Business setup before services?** Yes: details are saved, then business type, then services.
2. **Select/deselect optional modules?** Yes, with dependency/license checks; post-setup disabling with saved data requires confirmation.
3. **Dashboard without paid modules?** Yes, including a core-only workspace.
4. **Only enabled accessible sidebar modules?** Yes; future tools stay in discovery and owner management remains accessible.
5. **Does [+] open management?** Yes, for authorized owners.
6. **Can an unlicensed paid module activate?** No. Server checks actual licenses; no checkbox grants one.
7. **Does changing modules reset the 14-day trial?** No.
8. **Any real payment charged?** No.
9. **What needs database deployment approval?** Pending migration 0006 and, if not already applied, Phase 1 migration 0005 with its supplemental policy rollout; coordinated staging/code acceptance is required. Nothing was externally applied here.
