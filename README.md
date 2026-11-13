# SERVQO · v0.1

A multi-tenant website builder for independent cafés, built with Next.js App Router, React, strict TypeScript, Tailwind CSS, Supabase Auth/Storage/PostgreSQL, Drizzle, dnd-kit, Zod, and Lucide. This is a server-backed application: drafts, published layouts, products, media records, and demo entitlements live in PostgreSQL. There is no local-storage substitute for persistence.

Merchant-level 14-day trials and the subscription foundation are documented in [docs/SUBSCRIPTIONS.md](docs/SUBSCRIPTIONS.md). The new migration must be reviewed and applied before deploying this code. Payments remain disconnected; demo buttons never grant paid access.

For a workspace form that stays loading, see [workspace diagnostics and log investigation](docs/WORKSPACE-TROUBLESHOOTING.md). Run `npm run workspace:diagnose` for redacted, read-only connection timings.

## Requirements

- Node.js 22.x and npm.
- A Supabase project you control. No credentials are included.
- A PostgreSQL connection with permission to run migrations and server-side application queries. Use the Supabase session pooler if your host cannot reach the direct IPv6 database endpoint.

For Vercel configuration, reviewed migration commands and Auth URL setup, see [DEPLOYMENT.md](DEPLOYMENT.md). Runtime pooling and migration connections are configured separately.

## Setup

1. Run `npm ci` (`npm.cmd ci` in Windows PowerShell if script execution is restricted).
2. Copy `.env.example` to `.env.local`, then fill in the values below.
3. In Supabase Authentication → URL Configuration, set Site URL to `http://localhost:3000` for development (your HTTPS origin in production). Configure the confirmation callback and email template as described in DEPLOYMENT.md. Set your password policy to at least eight characters. Enable email/password authentication.
4. Run `npm run db:migrate`. This applies the committed Drizzle migration and `supabase/policies.sql`, including RLS and the public image bucket. The script requires a **Supabase** database because it references `auth.uid()` and `storage.objects`.
5. Create a user in Supabase Authentication (or sign up at `/login`, confirm the email, and sign in). Copy that user's UUID into `SEED_USER_ID`.
6. Run `npm run db:seed`. The seed creates the deployed component catalog, a demo café, a published homepage, five categories, and six menu products. The existing Supabase user owns the café. The seed is repeatable and does not reset edited listings or existing café content.
7. Run `npm run dev`, open `http://localhost:3000`, and sign in with that user's email/password. Visit `/sites/bloom-cafe` to see the seeded public site.

Migration also registers the component catalog before onboarding other accounts. A new account can create its own café and website from `/dashboard`; its homepage begins as a private draft. No user receives administrator access automatically.

### Environment variables (manual configuration)

| Variable                               | Purpose                                                                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                         | **Secret, server-only.** Supabase Postgres connection URI, including your database password. Percent-encode special password characters. Never prefix this variable with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SUPABASE_URL`             | Your Supabase project URL.                                                                                                                                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The project's public publishable key (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported). Protected resources remain covered by RLS.                                              |
| `NEXT_PUBLIC_APP_URL`                  | Your app origin, documented for deployment/auth configuration.                                                                                                                           |
| `MIGRATION_DATABASE_URL`               | Direct/session PostgreSQL URI for migration tooling; do not use transaction port 6543.                                                                                                   |
| `SEED_USER_ID`                         | Existing confirmed Supabase Auth user UUID; seed tooling only.                                                                                                                           |

The application does not need a Supabase service-role key. Never put a service-role key in the browser or commit `.env.local`. `DATABASE_URL` is privileged: all application database access goes through server-only modules and explicit tenant checks. Use a dedicated database user with only needed privileges for a production deployment; run migrations separately as the owner.

## Working flows

The merchant sidebar includes Overview, POS / Cashier, Orders, Maintenance, Website Builder and Settings. Layout preview and demo unlocking now live inside Website Editor. Old store/gallery URLs redirect there. See [editor designs and deployment](docs/EDITOR-DESIGNS.md) and [navigation](docs/NAVIGATION.md).

- **Authentication:** email/password sign-up, confirmation, sign-in and sign-out; server-validated sessions and refresh cookies through Next.js Proxy.
- **Merchant workspace:** operational overview, POS and Orders, page creation, visual editor, menu manager, media library and business settings; responsive navigation and light/dark appearance.
- **Editor:** add, remove, reorder and configure sections. Preview any active layout in either side-panel dropdown. Locked designs cannot be saved or published until explicitly unlocked through the demo checkout. Colors and content are independently editable. Save draft before publishing; ownership and revision checks are enforced by the server.
- **Design layouts:** three structurally distinct headers with preserved colors, plus the existing hero, menu and other section layouts. New headers use version 3; earlier saved/published versions retain their renderers. Existing merchant entitlements remain valid. See [editor designs](docs/EDITOR-DESIGNS.md) for the additive version-registration migration.
- **Public sites:** `/sites/[slug]` and `/sites/[slug]/[page-path]` render only the published layout. SEO title/description use page/business information. Menu sections show currently available merchant products. WhatsApp ordering uses the configured business number. Menu and business data update live independently of design publication.
- **Demo unlocks:** lock/price buttons in editor dropdowns open a clearly labeled no-payment demo checkout. Entitlements persist per merchant. Existing catalog prices remain illustrative USD; menu prices remain MYR in integer sen.
- **Menu:** category creation/rename/deletion, product creation/edit/deletion, image uploads, ordering and visibility. A category containing products cannot be deleted until its products are moved or removed.
- **Media:** validated JPEG, PNG and WebP uploads up to 4 MiB. Copy an uploaded URL into a section or product. The bucket is public because these images appear on public websites; uploaded media is not confidential.
- **Admin:** `/admin` requires a server-side `admin` profile role. Manage categories, USD prices, free/premium status, and listing visibility for deployed components. Executable components enter the library only through code deployment.

### Grant an administrator

Using Supabase SQL Editor as a trusted project owner, after the user has a profile:

```sql
update public.user_profiles set role = 'admin' where id = 'YOUR_AUTH_USER_UUID';
```

Ordinary merchants cannot update their profile role, create entitlements directly, or access admin mutations. Admin catalog changes do not rewrite existing published snapshots. Making a free component premium requires an entitlement on subsequent saves. Unlisting a component stops new selections/saves; existing published sites retain their deployed component implementation.

## Commands

```text
npm run dev            # local development
npm run typecheck      # strict TypeScript
npm run lint           # Next/React ESLint rules
npm test               # security/configuration/publishing tests
npm run build          # production compilation
npm start              # serve the production build
npm run db:generate    # generate SQL after schema changes
npm run db:migrate     # apply SQL and Supabase policies
npm run db:seed        # register components and create demo café
npm run db:catalog     # add new designs/versions without changing merchant data
npm run format         # format source
```

## Architecture

```text
src/app/                    App Router, server-rendered loaders, auth/public/admin routes
src/components/dashboard/   Merchant workspace and management interfaces
src/components/editor/      Interactive dnd-kit visual editor
src/components/website/     Trusted, version-addressed registry and shared renderer
src/lib/models.ts           Version-1 settings validation, catalog and layout types
src/lib/auth.ts             Supabase SSR clients and server-side role/membership guards
src/server/actions.ts       Validated mutations, ownership and entitlement enforcement
src/server/queries.ts       Scoped dashboard and published-only public loaders
src/db/                     Drizzle schema and server-only connection
drizzle/                    Committed SQL migration and metadata
supabase/policies.sql       RLS, grants, storage bucket and object policies
scripts/                    Database migration and seed runners
tests/                      Configuration and server-action security regression tests
```

Pages keep JSONB draft/published snapshots plus a normalized `page_sections` projection of the current draft. Publishing locks the tenant record, checks the page's revision, validates all sections and entitlements, updates the snapshots and projection, and records an immutable revision in one transaction. Failed validation rolls back the write. Menu ownership/category references are checked server-side. Catalog and business roles are never trusted from browser input.

All application tables have RLS enabled. Authenticated browser clients may read their tenant records; no browser role can write application tables. Anonymous browser database reads are denied. The public route uses a server-only database connection and selects the published snapshot explicitly; it never serializes private drafts or entitlements. Storage insert/delete policies verify the merchant UUID in each path against membership. The migration should be installed on a dedicated project; review any additional policies you introduce because PostgreSQL combines permissive policies with OR.

### Component evolution

The registry resolves `(key, version)` to trusted React code. The original version-one layouts remain in `src/components/website/legacy.tsx`; redesigned layouts register as version two. Applying a design explicitly upgrades that draft section. Opening an existing page never rewrites its version, settings, published snapshot or entitlement. Version-two defaults add optional eyebrow, typography, image descriptions and gallery-photo settings; old configurations remain valid. Each library entry has a unique key, category, supported versions, editable Zod schema, defaults, descriptive metadata and trusted preview/render implementation. New incompatible versions must add their own implementation/schema rather than modifying saved configuration in place. Unknown versions render a safe unavailable section.

**Upgrading an existing database:** run `npm run db:catalog` (also included in `db:migrate` and `db:seed`). This registers new component/version/store rows without changing existing listing availability, prices, free/premium status, entitlements, drafts or published pages. A seed rerun does not replace merchant photos or existing website content. Fresh demo sites use bundled photography in `public/images/cafe`; its license/source manifest is included. Fonts are locally hosted Cormorant Garamond and DM Sans, with OFL licenses in `public/fonts`.

### Verification and limits

Automated tests cover component/schema selection, entitlement enforcement (including hidden sections), safe URLs, unauthorized tenants, tenant-owned page/category checks, concurrent revisions, draft/published separation, publish revisions and admin denial. The database suite executes both committed migrations and the RLS SQL in embedded PostgreSQL (PGlite), verifying tenant reads, denied role/entitlement writes, anonymous denial, composite tenant foreign keys and storage path authorization. Supabase's host auth/storage schemas are stubbed for these tests. Server-action tests use mocked database/auth boundaries; these checks do **not** replace an integration check against your actual Supabase project.

Current editor verification includes TypeScript, ESLint, the full regression suite and a production build. Browser QA covers locked previews, demo checkout cancellation/confirmation, color preservation, save-before-publish and dropdown/header responsiveness at desktop, tablet and phone widths. Checkout/browser fixtures simulate actions; real server policy and migration behavior are tested separately in local embedded PostgreSQL.

The earlier production dependency audit reported zero production advisories. The full audit reported 12 moderate development-tool advisories through Drizzle's old esbuild loader and ESLint's transitive minimatch dependency. No dependencies were added during this design phase. The suggested forced fixes downgrade major tool versions; they were not applied.

Visual fixtures are available with `npm exec tsx -- scripts/design-fixtures.tsx` at `http://127.0.0.1:3200`, `/library`, and `/variant/hero-editorial`. This loopback-only test server uses the production renderer with sample props and never bypasses application authentication. Local screenshots and results are ignored under `.design-qa/`. `scripts/check-designs.ts` expects an installed headless browser exposing DevTools on port 9228 and the interactive gallery bundle built from `scripts/gallery-fixture.tsx`; it is separate from `npm test` and production routes.

After configuration, test with two separate confirmed accounts: create separate merchants, edit/save/publish a page, unlock a premium design, upload an image, add a menu product and inspect the public route. In Supabase, verify an authenticated user cannot read the other tenant's rows or write profiles/entitlements directly. Check logged-out `/admin` and non-admin access, then promote a test administrator and update a listing. Try a stale editor tab to confirm revision protection.

Supabase integration, RLS execution, email delivery and real browser interaction require your configured environment and are not claimed by a credential-free build. No online payments, custom domains, POS, team invitations, analytics, billing or automated version migration are implemented. Complete themes are explicitly marked as future functionality. Production hosting should use a Next.js-compatible Node runtime with the server-only environment variables configured; this repository does not publish a static substitute through Sites.
