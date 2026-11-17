# SERVQO — Current Project Status Audit

Audit date: 17 November 2026 (Asia/Kuala_Lumpur). Package version: `0.2.2` in the working tree. Git HEAD at inspection: `b2251fe` (`0.2.1 ui`). The pre-existing `package.json` modification was preserved.

## 1. Executive Summary

SERVQO is a server-backed, merchant-isolated café website builder with a functional pickup POS and staff order queue. It is more than a UI prototype: onboarding, menu persistence, draft/publish, media operations, subscription gates and durable orders have executable implementations and automated coverage.

It is not yet a complete retail or service-business operating system. Payments are disconnected; employee administration and granular staff permissions are absent; there is no appointment scheduling, inventory, customer management, custom cake workflow or dedicated customer-facing order display. The existing Orders page is an interactive staff/kitchen queue, not a separate public display.

The strongest reusable foundation is the merchant/auth model, versioned website renderer/editor, media handling and transactional order lifecycle. The main expansion barriers are café-specific content models, an all-module dashboard loader, identical owner/editor capabilities, polling and missing operational domains.

**Readiness verdict:** suitable for a controlled café/pickup pilot, subject to production verification and the findings below. Suitable as a foundation for cake shops with extensions. Not ready to claim full hair/nail salon support without a new booking and staff-resource domain.

### Evidence and limits

- Inspected application routes, components, server services/actions, schema, SQL migrations/policies, scripts, tests and project documentation. Findings below reference implementation files/functions rather than relying on navigation labels.
- Ran TypeScript, ESLint, all tests and a production build successfully during this audit.
- Compared metadata on the database configured by local `DATABASE_URL` using an explicit PostgreSQL **read-only transaction**. No business/customer records were selected. All 22 expected public application tables and all expected column names exist; all 22 have RLS enabled. Expected policy names and trial/order audit triggers were present; returned public foreign-key/check constraints were validated.
- That metadata check is not a complete schema diff: column types/defaults, index definitions, policy expressions, function bodies, catalog contents and migration journal hashes were not exhaustively compared. It does not prove the local database is the one used by Vercel production.
- No production data changed, no migrations/seed/catalog commands ran, no UI/features were modified, and no deployment occurred. Only this report is intended as a tracked audit deliverable.
- Live email delivery, hosted login/cookie behavior, payment services, actual two-device operation, production latency/load and live storage deletion remain **unverified in this audit**. Automated Supabase/storage tests use mocks or host-schema stubs; PostgreSQL integration tests use PGlite.

## 2. Current Technology Stack

Versions below come from `package.json`, not assumptions about latest releases.

| Layer | Current implementation |
|---|---|
| Runtime | Node.js `22.x`; audit runner reported `22.19.0` |
| Framework | Next.js `16.4.6`, App Router, Server Actions, Node route handlers and `src/proxy.ts` |
| UI | React/React DOM `19.3.1`, TypeScript `6.0.3` with strict configuration |
| Styling | Tailwind CSS/PostCSS `4.3.5`; substantial dedicated CSS files for dashboard, editor, websites, POS and auth |
| Database | PostgreSQL through `postgres` `4.1.0` and Drizzle ORM `0.45.4` |
| Auth/storage | Supabase JS `2.119.0`, Supabase SSR `0.12.7`; email/password auth and public image bucket |
| Editor | dnd-kit core/sortable, trusted React component registry, JSON section schemas |
| Validation/icons | Zod `4.6.7`, Lucide React `1.71.0` |
| Tests | Vitest `5.1.0`, PGlite `0.5.16`; Node test environment |
| Quality/tooling | ESLint `9.39.5`, Prettier `3.9.10`, Drizzle Kit `0.31.11`, tsx |
| Deployment | Vercel-oriented configuration/docs; actual deployed region/environment settings not inspected |

`src/db/index.ts` lazily reuses a server database pool. `src/lib/database-config.ts` sets maximum 3 runtime connections, disables prepared statements, verifies remote TLS, bounds query/queue/connect times and uses `max_pipeline: 1` for the Supabase transaction pooler on port 6543. Migration tooling uses a separate session/direct connection. This is existing mitigation, not evidence that current production latency is fixed.

## 3. Implemented Features

### Classification rules

The requested classifications are used literally below. **Fully implemented and tested** means the stated bounded behavior has implementation and relevant automated coverage; it does not mean verified in production or complete for every future use case. **Implemented but not fully tested** means working source exists but coverage/integration verification is incomplete. **Partially implemented** means a material part of the feature is missing. **UI / Demo only** means the advertised operational outcome is simulated or absent. **Not implemented** means no corresponding end-to-end module was found. Hosted/service/device verification is a separate qualifier.

### Authentication and merchant access

| Feature | Classification | Evidence / actual boundary |
|---|---|---|
| Login and registration | Fully implemented and tested | `signIn`, `signUp` in `src/server/actions.ts`; shared `AuthPage`; `tests/signup.test.ts`. Supabase calls mocked in tests; hosted sign-in unverified. |
| Email verification | Fully implemented and tested | `src/app/auth/confirm/route.ts` handles PKCE codes and POST token verification; `/auth/verify`, `/auth/confirmed`; `tests/confirmation.test.ts`. Real template/delivery/provider configuration unverified. |
| Forgot/reset password | Fully implemented and tested | `requestPasswordReset`, `updatePassword` in `src/server/password-actions.ts`, `/auth/recovery`; `tests/password-recovery.test.ts`. Email delivery/recovery allowlist unverified. |
| User profile persistence | Partially implemented | Onboarding creates `user_profiles` with authenticated UUID and email-derived name. No profile editing/account-management screen or service found. |
| Merchant onboarding | Fully implemented and tested | `createWorkspace`/`createBusinessRecord`, `WorkspaceOnboarding`; no membership returns onboarding. Transaction creates profile, merchant, trial claim, owner membership, website, draft homepage and default categories. Database trigger initializes subscription. `tests/onboarding-database.test.ts`, `trial-creation.test.ts`, dashboard outcome tests. |
| Merchant membership | Partially implemented | Durable membership lookup and tenant authorization work; no invitations, team CRUD, role assignment or merchant switcher. `dashboardData` selects the first membership without an explicit active-merchant choice. |
| Membership roles | Partially implemented | `merchant-capabilities.ts`: owner and editor get the same eight capabilities; unknown roles get none. No cashier-only/kitchen-only policy. Platform admin is a separate profile role checked by `admin()`. |
| Protected routes/actions | Fully implemented and tested | `user`, `authorize`, `admin` in `src/lib/auth.ts`, per-action capability checks and route requirements; relevant authorization/tenant tests. See security limitations in section 10. |
| Session handling / multi-device | Implemented but not fully tested | SSR cookies; proxy refreshes dashboard/admin/orders API sessions; sign-out scope is `local`. `tests/device-sessions.test.ts` verifies local-scope call. Two actual devices and provider session settings unverified. Each device must sign in independently. |

### Dashboard and maintenance

| Feature | Classification | Evidence / actual boundary |
|---|---|---|
| Overview | Fully implemented and tested | `Dashboard`, `OverviewStats`, `loadOverviewMetrics`; menu/collection counts plus SQL monthly completed-order totals and membership count; `tests/workspace-service.test.ts`. Revenue definition is limited; see section 11. |
| Sidebar / implemented deep links | Fully implemented and tested | `dashboard-navigation.ts`, `MerchantSidebar`, catch-all module route; `tests/navigation.test.tsx`. Coming-soon entries are disabled. |
| POS / Cashier | Fully implemented and tested | Bounded pickup, cash-or-unpaid flow; `PosScreen`, `createPosOrder`, `tests/orders-database.test.ts`. Full operational acceptance on devices unverified. |
| Orders staff screen | Fully implemented and tested | `OrdersScreen`, `OrderTicket`, status actions, durable cancellation acknowledgement; order database/API/presentation tests. |
| Dedicated Order Display Screen | Not implemented | No separate read-only customer display route, pairing/token model or display-specific data projection. Existing staff Orders screen/fullscreen is reusable UI groundwork only. |
| Maintenance group | Implemented but not fully tested | Navigation container for Menu and Business; it is not a separate operational service. |
| Menu/category management | Fully implemented and tested | `MenuManager`, `ProductEditor`; product/category actions; tenant/category validation and product tests. Category management is embedded in Menu; old category URL redirects. Broader interactive category CRUD coverage incomplete. |
| Employee management | UI / Demo only | Disabled `comingSoon` navigation entry. “Employees” metric counts all merchant memberships including owner; it is not an employee subsystem. |
| Table management / promotions | UI / Demo only | Disabled `comingSoon` entries; no business tables or service flows. Legacy order table labels are not table management. |
| Business information | Implemented but not fully tested | `updateBusiness` persists name, description, address, hours, phone after membership/capability checks; no business-type model. |
| Workspace appearance | Implemented but not fully tested | Light/dark state in `MerchantWorkspaceProvider`; not persisted as a user preference in DB or browser storage. |
| Subscription access enforcement | Fully implemented and tested | 14-day trial, database timestamps/immutable claims, verified-active policy, expiry write gates and read/export retention; subscription test suites. |
| Subscription purchasing/renewal | UI / Demo only | `SubscriptionPanel` upgrade/manage button displays a no-payment notice; it does not activate a plan. |
| JSON export | Fully implemented and tested | `/dashboard/export`, tenant-scoped repeatable-read read-only transaction, no subscription gate; `tests/subscription-export.test.ts`. Includes saved data/media URLs, not original image binaries. |

### Website Builder

| Feature | Classification | Evidence / actual boundary |
|---|---|---|
| Reusable sections / registry | Fully implemented and tested | `models.ts`, `componentRegistry`, `resolveComponent`, `WebsiteRenderer`; component/design-library/renderer tests. 19 deployed keys across nine section categories. |
| Header variants | Fully implemented and tested | Three latest layouts: minimal, stacked centered branding, masthead/navigation; headers v3, with legacy renderers retained. Layout and color are independent. |
| Hero / content / menu / gallery / footer | Fully implemented and tested | Four hero, two about, three menu, two gallery, two footer keys; ordering/location/contact one each. Content is constrained section settings, not a general rich-content CMS. |
| Visual editor and live preview | Implemented but not fully tested | `Editor`: add/remove/reorder/hide sections; text, image, links, alignment, spacing, typography/colors; desktop/tablet/mobile preview. Model/render/save tests exist; no committed full-browser editor interaction suite. |
| Draft and publish | Fully implemented and tested | `saveLayout`, `saveEditorLayout`: tenant/revision checks, DB transaction, saved-draft-before-publish, published snapshot and revision history; `tests/publishing.test.ts`. |
| Page management | Partially implemented | List/create/select/edit pages, unique website path; no rename/delete/unpublish flow or nested page-path creation. `createPage` permits one path segment. |
| Media upload/delete | Fully implemented and tested | Signature/MIME/size validation, merchant paths, Supabase upload and metadata, confirm dialog deletion; product and workspace service tests. Real bucket behavior unverified; storage/SQL consistency caveats remain. |
| Theme management | Partially implemented | Section colors/typography/spacing and defaults exist. No persisted site-wide theme entity, theme marketplace or design-token inheritance. |
| Component entitlements | Fully implemented and tested | Merchant entitlement persistence; selection preview allowed, server blocks saving/publishing locked/inactive designs including hidden ones; `validateSelection`, design-unlock/publishing tests. |
| Component purchases | UI / Demo only | `unlockDesignDemo` -> `unlock` records persistent `source: demo` ownership. No charge, gateway or verified purchase record. |
| Standalone Component Store | Not implemented as a current destination | Previous routes redirect to the editor; legacy gallery components remain in source. Purchasable-design preview/unlock UI now lives in editor dropdowns. |
| Public websites | Fully implemented and tested | `/sites/[slug]/[[...path]]`, `publicData`, shared renderer use published layouts and available merchant products; renderer/publishing tests. Production rendering with real tenant content unverified. |
| Public online checkout | Not implemented | `Ordering` in `sections/essentials.tsx` links to WhatsApp/configured URL. It does not submit POS orders. |
| Platform catalog admin | Implemented but not fully tested | `/admin`, `adminListing`: deployed design category/price/premium/active configuration; admin denial test. No production admin acceptance test or subscription activation UI. |

### POS and orders detail

| Feature | Classification | Evidence / actual boundary |
|---|---|---|
| Product/category selection and cart | Implemented but not fully tested | POS search/filter/tap/quantity controls; `usePosDraft` stores a merchant-keyed tab draft in sessionStorage, with in-memory fallback. Browser interaction not exercised in this audit. |
| Checkout/order persistence | Fully implemented and tested | Server validates current product availability/prices, quantities and cash; computes totals, snapshots items and creates order+event atomically. |
| Payment methods/status | Partially implemented | Only `cash` and `unpaid`, with cash received/change. No card, QR, e-wallet, split tender, payment ledger, pay-later settlement action or reconciliation. |
| Order lifecycle | Fully implemented and tested | Pending -> preparing -> ready -> completed; pending -> cancelled only. Reasons required; versions prevent stale writes; cancellation acknowledged separately. |
| Realtime synchronization | Partially implemented | Actual mechanism is authenticated HTTP polling every 3 seconds, not Supabase Realtime/WebSockets. Hidden/offline handling, retries and stale warnings exist. No offline submission queue. |
| Ticket history | Partially implemented | Active/unacknowledged queue plus latest 50 closed tickets. UI “show all” means this returned window, not unlimited database history. No date search/pagination/full reporting. |
| Sales reports | Partially implemented | Overview monthly completed-order gross total/count only. No detailed sales report, tax/net/refund/tender reconciliation, downloadable sales report or product/staff analytics. |
| Fullscreen screens | Implemented but not fully tested | Shared `OperationsFrame` uses Fullscreen API with fixed-layout fallback and exit control. Browser support/physical devices unverified here. |
| Staff-specific operational permissions | Not implemented | Same owner/editor capabilities; no staff onboarding or role editor. Capability plumbing exists for future policies. |

## 4. Demo / Placeholder Features

1. **Design checkout:** grants real database entitlements for free under an explicit demo label. Prices are illustrative USD; this is not a verified payment (`unlock`, `unlockDesignDemo`, `DesignUnlockDialog`, `design-pricing.ts`). This matches the current requested demo stage but must change before selling designs for money.
2. **Upgrade / Subscribe / Manage subscription:** notice only. Does not write active status or verified payment (`SubscriptionPanel`). Actual expiry checks are real and continue to apply.
3. **Employee/Table/Promotions/Staff Permissions/Security navigation:** disabled planned entries (`dashboard-navigation.ts`). Their names are not evidence of delivered modules.
4. **Starter content:** initial café copy, stock/default photos and categories come from `initialLayout`, `defaultSettings`, `createBusinessRecord` and seed fixtures. These are editable starter content, not transactional mock persistence.
5. **Optional outlets sidebar props:** `MerchantSidebar` accepts outlet selection props, but there is no outlet table, active outlet authorization or operational multi-location implementation.
6. **PWA manifest:** icon/install metadata exists; no service-worker/offline order engine was found. Installable appearance must not be advertised as offline POS support.

## 5. Missing Features

- Employee CRUD/invitations, role assignment, shift/timekeeping and cashier/kitchen separation.
- Customer records, loyalty, gift cards, CRM and customer-facing authenticated ordering.
- Inventory, ingredients, stock movements, suppliers, procurement and recipes/BOM.
- Real payment gateways/webhooks, payment/refund ledger, unpaid-order settlement, reconciliation and cash drawer/shift closing.
- Taxes/service charges/discounts/promotions, product modifiers/variants, receipt printing/hardware integration.
- Dedicated public/customer order-status display and secure device pairing.
- Complete searchable/paginated order history and operational/sales reporting.
- Cake customizations, quotes/deposits, future pickup dates, production scheduling and delivery workflows.
- Salon service catalog/durations, appointments, staff-resource calendars, availability/conflict prevention, reminders, deposits/no-shows and commissions.
- Business types/module provisioning, multi-outlet schema, tenant timezone/currency configuration, custom domains and automated production observability/SLO validation.

These conclusions follow from the schema inventory, route inventory, navigation configuration and current order/payment/settings models; no corresponding complete services or migrations were found.

## 6. Database Tables and Relationships

Source of truth in repo: `src/db/schema.ts`; migrations `drizzle/0000_strong_pretty_boy.sql` through `0004_header_layout_versions.sql`; extra policies/storage setup in `supabase/policies.sql`. There are **22 application tables**. All UUID `id` primary keys below default to random UUIDs unless noted. Creation timestamps are generally `created_at`.

| SQL table | Primary key and main columns | Relationships / module |
|---|---|---|
| `user_profiles` | `id` UUID supplied from Auth; name, role | Shared identity; memberships reference profile. No FK to Supabase `auth.users` in application schema. |
| `merchants` | `id`; name, unique slug, description, address, hours, phone, trial_started_at, trial_ends_at | Shared tenant root. No business type, currency, timezone or outlet fields. |
| `merchant_users` | `id`; merchant_id, user_id, role | FK merchants/profiles; unique (merchant,user), user index. Shared authorization. |
| `websites` | `id`; unique merchant_id, title, description | FK merchant; one website per merchant. Unique (merchant,id) for tenant FKs. |
| `pages` | `id`; merchant_id, website_id, path, title, draft JSONB, published JSONB, revision | Merchant/website FKs and composite tenant FK; unique (website,path). `updatedAt` property maps to SQL `created_at`, a naming debt. |
| `component_definitions` | `key` text PK; name, category, premium, active | Shared deployed design catalog. |
| `component_versions` | `id`; component_key, version, schema JSONB | FK definition; unique (component_key,version). |
| `store_products` | `id`; unique component_key, price | FK definition; design prices, not merchant menu products. |
| `merchant_entitlements` | `id`; merchant_id, component_key, source | FKs merchant/definition; unique merchant+key. Shared website licensing data. |
| `menu_categories` | `id`; merchant_id, name, position | FK merchant; unique (merchant,id) for product tenant FK. |
| `menu_products` | `id`; merchant_id, category_id, name, description, price, image, available, position | FKs merchant/category plus composite (merchant,category) FK. Shared menu, public website and POS content. Integer MYR sen. |
| `media_assets` | `id`; merchant_id, unique path, url, name | FK merchant; storage metadata only, not image bytes. Shared builder/menu media. |
| `website_revisions` | `id`; merchant_id, page_id, sections JSONB | Merchant/page and composite tenant FKs. Published layout history; no revision-history restore UI. |
| `page_sections` | `id`; merchant_id, page_id, component_key, version, position, visible, settings JSONB | Tenant page FK plus registered component+version FK; mirrors saved layout structure. |
| `subscription_plans` | `id` text PK; name, description, active | Shared plan catalog; no gateway price identifiers. |
| `merchant_subscriptions` | `id`; unique merchant_id, plan_id, status, current_period_ends_at, payment_verified_at, verification_source, updated_at | Merchant/plan FKs; active status requires verification fields and period. |
| `subscription_events` | `id`; merchant_id, kind, details JSONB | FK merchant; append-only audit trigger. |
| `merchant_trial_claims` | `user_id` UUID PK; merchant_id; `claimedAt` maps to created_at | FK merchant; immutable claim survives Auth account deletion. One claim per Auth subject, not per human/email. |
| `pos_order_counters` | `merchant_id` UUID PK; last_number | FK merchant; serialized ticket numbering. Browser SELECT policy always false. |
| `pos_orders` | `id`; merchant_id, number, request_id, fingerprint, status, version, fulfillment, table_label, note, total, payment, cash_received, change_due, created_by, timestamps, cancellation fields | Merchant FK; unique tenant+number/request/id. Status/payment/amount/cancellation checks. Actor UUIDs not profile FKs. |
| `pos_order_items` | `id`; merchant_id, order_id, product_id, name, image, unit_price, quantity, line_total | Composite order tenant FK; unique order+product. Product ID deliberately has no product FK so historical snapshots survive deletion. |
| `pos_order_events` | `id`; merchant_id, order_id, version, kind, from_status, to_status, reason, actor_id | Composite order tenant FK, unique order+version; append-only trigger. |

### Relationships and isolation

Merchant -> memberships, website -> pages -> sections/revisions. Merchant -> categories -> products. Merchant -> subscriptions/events/claims/entitlements/media/orders. Order -> item snapshots and lifecycle events. Definitions -> versions/store listings/entitlements/sections. Products/categories/media/business are shared content dependencies between POS and Website Builder; website orders are not automatically created from public menu views.

Server-side Drizzle uses a database connection rather than forwarding the logged-in user's JWT into every SQL statement. Therefore server queries require explicit `authorize`/`user` and merchant predicates; RLS alone is not the server authorization boundary, especially with an owner/privileged database role. Browser application-table writes are revoked by the policy scripts. Authenticated SELECT policies scope tenant data; public sites use a controlled server loader. Composite tenant FKs add protection against cross-merchant associations even through privileged writes.

The public `merchant-media` Supabase Storage bucket stores image bytes under `<merchant UUID>/<random UUID>.<extension>`; `media_assets` stores references. Bucket public reads are intentional. Application upload cap is 4 MiB (`uploads.ts`); bucket policy/config script uses 5 MiB. Policy functions and trigger behavior exist partly in SQL migrations and are not fully represented by Drizzle table definitions.

### Migration responsibilities and observed comparison

- `0000`: initial builder/merchant/menu schema; `0001`: tenant indexes/composite FKs; `0002`: subscription/trial tables, backfill, triggers, RLS; `0003`: POS tables/checks/RLS/event preservation; `0004`: header version-three registration.
- `scripts/migrate.ts` applies migrations, then storage/RLS SQL, then catalog registration. Looking only at generated schema SQL misses deployment responsibilities.
- Local configured database metadata matched the expected table/column-name set with no missing columns. All 22 tables reported RLS enabled. Expected POS/subscription/tenant policy names and initialization/preservation/audit triggers were observed; no returned FK/check constraint was unvalidated.
- Catalog rows/registered version-three contents, existing merchant subscription rows and exact production migration application were not checked. A clean build cannot prove these data/setup prerequisites.

## 7. Current Module Architecture

| Folder / route | Responsibility |
|---|---|
| `src/app` | App Router entry points, auth callbacks, public rendering, dashboard/API/export routes and global/module CSS |
| `src/app/dashboard/page.tsx` | Dynamic overview entry via `DashboardScreen` |
| `src/app/dashboard/[...module]/page.tsx` | Resolves implemented paths from navigation; required capability passed to loader; unsupported modules 404; old category/store paths redirect |
| `src/app/dashboard/layout.tsx` | `MerchantWorkspaceProvider` keeps unsaved layouts/page/theme state across route segments |
| `src/components/dashboard` | Main multi-view client Dashboard, sidebar, overview, onboarding, product/media/subscription UI |
| `src/components/operations` | POS, staff queue, tickets/cancellation, shared fullscreen/sync state and tab draft |
| `src/components/editor` | Editor, sortable sections, design lock picker/demo checkout and media selection |
| `src/components/website` | Trusted registry, typed section implementations and legacy versions |
| `src/server` | Auth/menu/builder actions; dashboard/public queries; dedicated order/workspace services and safe action wrappers |
| `src/lib` | Validation/domain models, authorization, capabilities, subscription/order rules, pooling, URL/config/error handling and diagnostics |
| `src/db`, `drizzle`, `supabase` | ORM schema, database connection, migrations, supplemental RLS/storage setup |
| `scripts`, `tests`, `docs` | Migration/catalog/seed/diagnostics tools; unit/PGlite tests; operational documentation |

Auth routes: `/login`, `/signup`, `/signup/check-email`, `/auth/confirm`, `/auth/verify`, `/auth/confirmed`, `/forgot-password`, `/auth/recovery`, `/reset-password`. Other endpoints: `/admin`, `/api/orders`, `/dashboard/export`, `/sites/[slug]/[[...path]]`, manifest. `/` redirects to dashboard. The build confirmed these routes.

Navigation is configured in `src/lib/dashboard-navigation.ts`. `MerchantSidebar` renders it filtered by capability. `Dashboard.navigate` changes client tab state and pushes history; popstate restores matching tab. Deep-link requests still run the server route/loader. Client navigation visibility is not permission enforcement; server actions must independently enforce access.

**Coupling:** `dashboardData` loads merchant, every page, products, categories, entitlements, media, global catalog, prices and subscription for all dashboard modules, even POS/Orders. `Dashboard` switches many screens inside one component. This expands payload/query failure impact and limits independent module scaling. Domain and design definitions share `models.ts`; onboarding hardcodes café categories. No business-type discriminator, module-installation model or active-outlet scope exists.

## 8. Current POS and Order Flow

1. Protected dashboard loads merchant menu/categories. POS filters available products, searches and builds a bill. `usePosDraft` persists a tab-scoped merchant draft; it is not a cross-device cart or offline order outbox.
2. New POS submissions use takeaway/counter pickup with a kitchen note and cash/unpaid selection. Legacy dine-in fields remain accepted by server schema and preserved for uncertain retry compatibility.
3. `placeOrder` delegates to `createPosOrder`: authenticate, authorize `pos:operate`, validate input and require valid trial/subscription.
4. Inside a transaction, set SQL timeouts, lock/upsert merchant counter, check request UUID/fingerprint, load and share-lock current available merchant products, verify expected prices, calculate totals/change, insert header, snapshot items, event and updated counter. Item/event/counter writes are combined in a CTE. This avoids trusting browser totals.
5. Exact request retry returns the same ticket; reusing the UUID for different details fails. Uncertain responses keep the bill locked for reconciliation/retry. Acknowledged ticket IDs/numbers are not fabricated optimistically.
6. `useOperations` fetches `/api/orders` with same-origin cookies and no-store caching. Orders polls every 3 seconds while active/visible/online. POS automatic polling is enabled when recent tickets are visible or a submission is uncertain; explicit refresh/reconnect also exists. Requests have a 12-second client abort; database timeouts are separate.
7. `operationsSnapshot` authorizes tenant access, loads active/unacknowledged cancellations plus 50 closed tickets, then item/event details. Menu can be included. It does not use Supabase subscriptions.
8. `changePosOrder` locks the ticket and checks expected version plus legal transition. Only pending orders may cancel, with reason. Preparing/ready cannot cancel. Status completion does not automatically charge or reconcile payment.
9. Cancelled tickets remain visible until `acknowledgePosCancellation`; events are append-only. Cash refunds remain a manual counter responsibility. Cancellation and acknowledgement remain possible after subscription expiry; preparing/ready/completing are subscription-gated.

This supports two signed-in devices using the same merchant queue in code. There is no private per-device pairing, push notification guarantee, printer integration or public display. Actual two-device concurrency/network behavior was not tested during this audit. PGlite covers transactions/idempotency/conflict scenarios but is not a hosted pooler/load test.

## 9. Current Website Builder Architecture

- `models.ts` defines Zod section/settings/layout schemas, catalog metadata, defaults, insertion and variant-switching helpers. Trusted deployed React components render content; merchants cannot upload executable component code.
- `componentRegistry` maps key+version to React implementations; legacy v1/v2 renderers remain. Header latest version is 3; other current layouts generally use 2. Database version records must also exist for section FK validation.
- `Editor` maintains a working layout through dashboard context, selected section, saved snapshot and revision; dnd-kit handles sorting. Preview uses the same `WebsiteRenderer` as public sites. Responsive preview is a width simulation, not a separate published page.
- Locked active designs can be previewed. Explicit demo unlock creates merchant ownership; until owned, both UI and server prevent saving/publishing even if a locked section is hidden.
- `saveLayout` authorizes tenant/capability, checks subscription and schemas, locks the merchant, checks page revision and validates active/owned designs. It writes JSON layout and normalized sections transactionally. Publish requires the submitted layout to equal the saved draft after schema normalization; publish also records a revision.
- Draft restoration returns the saved draft, not an arbitrary historical published revision. No full history browser/rollback workflow was found.
- `publicData` resolves merchant slug and page path, requires published layout, and loads currently available merchant products. Public layout is a snapshot; product/business edits are live shared data and can affect the public website without publishing again.
- Public metadata and page rendering each call `publicData`; no request memoization is explicit. Dynamic rendering and repeated reads are optimization candidates after measurement.
- Themes are per-section settings. Gallery content is image URLs; menu content comes from merchant products. Ordering CTA is WhatsApp/link routing, not integrated checkout.

## 10. Authentication and Security Findings

### Existing protections verified in source/tests

- Server `getUser()` validates identity rather than trusting an unverified browser session object. `authorize` checks user+merchant membership and optional capability; `admin` requires profile admin role.
- Merchant predicates and composite FKs protect critical builder/menu/order paths. Tests exercise cross-tenant product/page/order rejection and RLS behavior.
- Browser application-table writes are revoked; tenants cannot directly grant entitlements/admin status through those tables under supplied policies. SQL audit events/trial claims are append-only.
- Auth redirect helpers reject external/protocol-relative destinations and unsafe origins. Confirmation/recovery responses use private/no-store and no-referrer headers. Real production callback allowlists remain an operational prerequisite.
- Public Supabase configuration rejects known service-role/secret-key formats; database URL stays server-side. `.env.local` is ignored and was not tracked in the current index. No secret values are included in this report. This is not a full historical secret scan.
- Uploads check byte signatures, MIME and size, use generated merchant paths, and reject SVG/executable image formats. Layout URLs/styles are constrained; React escapes merchant text.
- `workspaceTrace` logs static stage names, random correlation references, timing and allowlisted codes, not forms, tokens, email, SQL or query results.

### Findings and gaps

| Priority | Finding / evidence | Consequence / recommended treatment |
|---|---|---|
| High before introducing staff roles | `capabilitiesForRole` gives owner/editor identical broad capabilities. Root `dashboardData()` has no required capability and still returns tenant datasets for any existing membership; deep-link requirements differ. Browser tenant SELECT policies are membership-based, not capability-based. | Current roles do not provide least privilege. Define read/write capability boundaries consistently across root loaders, API, actions and direct Supabase access before adding restricted staff. No cross-tenant disclosure was demonstrated. |
| High before restricted staff/media policies | Storage insert/delete policies check membership; insert also subscription, delete does not. They do not check website/menu capabilities. | A valid member can directly call storage APIs, bypassing app-role checks; direct deletion can leave metadata/website references dangling. Align intended storage permissions with role model and cleanup flow. |
| High before paid launch | `unlock` freely persists demo ownership, including premium designs. No payment provider/webhook verification exists. | Expected for current demo, unsuitable for paid licensing. Replace demo entitlement issuer before claiming real sales; preserve provenance. |
| Medium | Server connection may be privileged and therefore bypass RLS. Supplied RLS is enabled, not forced; no per-request JWT SQL session context is established. | Explicit tenant authorization remains essential. Review deployed DB grants/owner role and use least privilege; production grants not fully audited. |
| Medium | Password reset/update validates a current user but does not require a separately recorded recovery state or current-password reauthentication. Local sign-out is used. | Any valid signed-in session can invoke password change. Define account-change/reauthentication and session-revocation policy; provider behavior/settings unverified. |
| Medium | App-level throttling, MFA, session/device administration and invitation controls are absent. | Verify Supabase/Vercel abuse controls rather than assuming managed defaults cover product requirements. |
| Medium | Some generic actions throw raw validation/provider errors and `Dashboard.run` displays `Error.message`; not all paths use safe structured wrappers. | Inconsistent UX and potential detail disclosure in development/integration changes. Audit remaining action boundaries; do not assume all errors are sanitized. |
| Expected visibility | Bucket is public; any known media URL is readable. | Suitable for website images; not private customer documents. A future salon/cake attachment module needs a separate private-media design. |

RLS metadata presence and passing automated tests do **not** constitute a complete security certification. No penetration test, dependency vulnerability audit, live cookie/header assessment, provider configuration audit or adversarial multi-device test was performed.

## 11. Known Bugs and Technical Debt

1. **Payment/revenue semantics:** `loadOverviewMetrics` sums all completed ticket totals, including `payment: unpaid`; there is no later settlement operation or payment ledger. It matches “completed-order revenue” but is not verified cash received or accounting revenue. Do not use as a reconciled financial report.
2. **History window:** `operationsSnapshot` limits closed tickets to 50; active queue is unbounded. No paging/date filters, so older tickets are not visible through normal history despite existing in DB/export. At high volume active queue and event payloads can grow significantly.
3. **Broad dashboard dependency:** every module depends on builder/catalog/media queries and subscription setup. A nonessential failing query can still fail the whole dashboard. Safe error UI exists, but loading has not been redesigned into per-module isolation.
4. **Media consistency edge case:** `removeMediaAsset` checks `bucket.exists(...).data` but does not examine its `error`; a failed existence check is not definitive proof of deletion. Storage and SQL are not atomic; SQL failure after deletion leaves metadata until retry. Existing tests cover positive “still exists” and common retry cases, not every ambiguous storage response.
5. **Referenced media deletion:** confirmation warns, but deletion does not rewrite product/draft/published references. Deleting a used image can break its displayed link. Upload cleanup also cannot guarantee removal if compensating storage deletion fails. Deletion is subscription-gated, including after expiry.
6. **Multi-merchant ambiguity:** dashboard uses `findFirst` membership without selection/order; schema permits multiple memberships. No business switcher/outlet persistence. Trial claims restrict an account to one newly claimed workspace, not to one membership or one human lifetime trial across new Auth identities.
7. **Timestamp naming:** pages' `updatedAt` and claims' `claimedAt` map through the shared `created()` helper to `created_at`. Source behavior is valid but misleading for schema maintenance/reporting.
8. **Café/currency/timezone coupling:** hardcoded starter categories, section language/class names, MYR product formatting and Asia/Kuala_Lumpur revenue boundaries. Illustrative design prices are USD. No per-merchant currency/timezone/business-type contracts.
9. **Catalog dual source:** executable registry and DB definitions/versions/listings require coordinated deployment/catalog registration. Missing version metadata can cause save FK failures even though preview renders. Admin page displays a static “version 1.0” label despite versioned renderers.
10. **Permission and subscription lifetime:** client subscription snapshot uses server time captured at load; long-lived UI may show stale access until reload. Server writes recheck. If subscription expires mid-shift, preparing/completing active tickets is blocked while cancellation/ack/read remain allowed; product policy needs explicit acceptance.
11. **Draft retention scope:** unsaved editor state survives dashboard navigation in React context, not a full browser reload. POS tab draft survives reload via sessionStorage, but is keyed by merchant rather than user and is not explicitly cleared by sign-out. Review shared-terminal behavior before staff rollout.
12. **Polling overhead:** 3-second snapshots include ticket items/events; proxy and action/loader may each validate auth. No measured production capacity budget, incremental cursor or realtime push implementation. Client abort alone does not establish that all server work stopped.
13. **Incomplete page lifecycle:** no page delete/rename/unpublish UI, custom domain provisioning or published-revision restore screen. `publicData` is called for both metadata and page rendering without explicit memoization.
14. **Error handling inconsistency:** sign-up lacks the broad provider/network catch used by newer sign-in/reset wrappers. Proxy refresh has no custom network fallback. Generic CRUD can still reach generic framework errors. Safe diagnostic references are strongest in newer paths.
15. **Testing/operations debt:** no committed end-to-end browser suite, hosted Supabase contract suite, load/soak test, physical device or printer testing. README still labels v0.1; package working version is 0.2.2. Vitest emits a configuration-loader compatibility warning.

Historical timeout reports (`57014`, `QUERY_TIMEOUT`) are evidence of cancelled/stalled DB operations, not proof of a missing membership subscription setup. Current code contains pooler/pipeline mitigation and safe error states. This audit did not reproduce or rule out production timeout recurrence and did not remove any authorization checks.

## 12. Test and Build Results

Commands ran on 17 November 2026 against this working tree, without source fixes or production mutations:

| Check | Exact result |
|---|---|
| `npm.cmd run typecheck` | Passed, exit 0; `tsc --noEmit` |
| `npm.cmd run lint` | Passed, exit 0; `eslint .`, no reported lint errors |
| `npm.cmd run test` | Passed, exit 0: **30 test files, 175 tests**; reported duration **12.00 seconds** |
| `npm.cmd run build` | Passed, exit 0; optimized Next build compiled, TypeScript completed, static generation **10/10**, route table emitted |
| Metadata-only Supabase check | Passed; explicit read-only transaction, 22 expected tables, zero missing expected column names, RLS enabled on all 22; policy/trigger/constraint presence inspected |

Initial sandboxed test attempt could not spawn workers (`EPERM`), so no tests executed in that attempt. The successful retry used approved subprocess access. The metadata helper similarly needed subprocess access for tsx/esbuild. These were environment restrictions, not failing assertions. Build used subprocess access as well.

Vitest warning: ESM syntax in `vitest.config.ts` is loaded as CommonJS and is incompatible with a future default native config loader. It did not fail the present suite. No dependency changes were made.

Coverage includes Zod/URL/config safeguards, registration/confirmation/recovery via mocked Supabase, trial and RLS SQL via PGlite with stubbed Supabase host schemas, onboarding/product/order transactions, tenant rejection, idempotency/version conflicts, publishing/entitlements, export, media failure handling and cancellation markup. Passing these tests does not validate live hosted service configuration, network speed or a cashier's complete browser workflow.

No test coverage percentage was generated. No new browser automation was run during this audit. Build success is compilation/renderability evidence, not live authenticated functional acceptance. No migration command was run; test migrations executed only in disposable PGlite databases.

## 13. Recommended Reusable Components

These are reuse recommendations grounded in current source, not implemented changes.

| Existing foundation | Reuse recommendation |
|---|---|
| `Brand`, auth components, `ServqoLoading`, result/onboarding screens | Shared brand/auth shell across business types; keep provider/session logic centralized. |
| `user`/`authorize`, merchant IDs and composite tenant FKs | Shared identity/tenant layer; extend with explicit active merchant/outlet and least-privilege policies. |
| Navigation model/sidebar | Keep declarative routes; derive enabled modules from business configuration once introduced. |
| Registry/WebsiteRenderer/Editor/settings schemas | Reuse website engine and versioned layouts; add business-specific content adapters rather than copying editor. |
| Media upload/picker/delete confirmation | Reuse for public marketing images with consistency fixes; separate private attachments. |
| `OperationsFrame`, `SyncStatus`, `OrderTicket`, cancellation dialog | Reuse operational shell/status presentation; make ticket fields and transitions domain-specific. |
| Order transactional service/idempotency/events | Reuse immediate-sale foundation and concurrency patterns; avoid pretending appointments/custom production orders have the same lifecycle. |
| Subscription policy and server gates | Reuse access foundation; add verified billing integration and module/plan entitlements deliberately. |
| Diagnostics/error references and test fixtures | Reuse structured logging and tenant/database regression patterns; add real integration/browser/load coverage. |

## 14. Risks for Multi-Industry Expansion

| Area | Cake shops | Hair / nail salons |
|---|---|---|
| Website + auth + business info + marketing media | High reuse; new copy/content variants | High reuse; new service/staff/gallery content |
| Immediate product POS / cash tickets | High reuse for ready-made cakes/retail | Reuse for retail products and checkout totals, not scheduling |
| Categories/products | Extend for sizes/flavors/options and custom quotes | Add a separate service catalog with duration, staff eligibility and pricing; do not model all services as stock/menu products |
| Orders queue | Extend for scheduled production/pickup | Not a booking calendar; appointment lifecycle needs separate modeling |
| Employees | New module required | New module plus availability, skills/resources and commissions |
| Scheduling | New production/future fulfillment workflow | New appointment availability and resource-conflict engine |
| Payments | New gateway/ledger/deposit/refund integration | Same, plus cancellation/no-show/deposit rules |
| Customer data | New customer/custom order domain | New client histories/consent/private records with appropriate data controls |

Key architectural risks: one shared all-module loader, café vocabulary embedded in data/defaults/renderer, broad roles, missing business/module configuration, lack of outlet/timezone/currency scope, and assuming all businesses share a kitchen-ticket lifecycle. A configurable design registry alone does not solve operational domain differences.

Expansion should preserve common tenant/auth/subscription/media infrastructure while introducing explicit product, service, booking and custom-order boundaries. Avoid one giant generic JSON business object or duplicate dashboards per industry. Keep existing published section versions compatible.

## 15. Recommended Next Development Phase

Recommended order; none of these features were implemented in this audit:

1. **Stabilize the current operational contract.** Verify actual production database/environment/regions, callback allowlists and two-device flow; measure authenticated query/action latencies. Add committed browser acceptance for login -> onboarding/existing merchant, product upload/save, draft/publish, POS submit -> kitchen -> complete/cancel.
2. **Close access and data-consistency gaps.** Introduce explicit staff capability/read boundaries, reconcile storage policies, handle ambiguous storage existence errors, define shared-terminal draft cleanup and expiry behavior for in-progress tickets. Clarify completed gross sales versus settled payments.
3. **Separate loaders/modules before adding industries.** Give operations, builder and overview focused server loaders; preserve shared layout and public URLs. Add active business/module configuration and merchant timezone/currency deliberately without rewriting existing records blindly.
4. **Deliver employees and a reusable sellable catalog foundation.** Invitations/roles first; then separate product/service concepts and optional variants/modifiers. Keep café POS behavior backward compatible.
5. **Pilot cake-shop retail first.** Reuse POS + builder; add scheduled/custom cake ordering only with explicit customization, quote/deposit and fulfillment requirements. This is a smaller extension than salon scheduling.
6. **Build salon booking as a new bounded module.** Service durations, staff/resource availability, transactional booking conflict prevention, appointment statuses and reminders; integrate checkout without forcing appointments into `pos_orders`.
7. **Connect real billing when approved.** Verified provider webhooks, durable payment/purchase provenance, idempotent processing, reconciliation/refunds and operational reporting. Keep current demo unlocks clearly identified until replaced.

**Decision:** build on the existing foundation, but introduce domain boundaries and real staff permissions before broad industry expansion. The current code is a working café website/pickup-order base, not yet a configurable all-industry SaaS platform.
