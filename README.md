# Bloom Builder · v0.1

A multi-tenant website builder for independent cafés, built with Next.js App Router, React, strict TypeScript, Tailwind CSS, Supabase Auth/Storage/PostgreSQL, Drizzle, dnd-kit, Zod, and Lucide. This is a server-backed application: drafts, published layouts, products, media records, and demo entitlements live in PostgreSQL. There is no local-storage substitute for persistence.

## Requirements

- Node.js 22.12+ and npm.
- A Supabase project you control. No credentials are included.
- A PostgreSQL connection with permission to run migrations and server-side application queries. Use the Supabase session pooler if your host cannot reach the direct IPv6 database endpoint.

## Setup

1. Run `npm ci` (`npm.cmd ci` in Windows PowerShell if script execution is restricted).
2. Copy `.env.example` to `.env.local`, then fill in the values below.
3. In Supabase Authentication → URL Configuration, set Site URL to `http://localhost:3000` for development (your HTTPS origin in production). Use the default confirmation email that confirms the account before sign-in. Set your password policy to at least eight characters. Enable email/password authentication.
4. Run `npm run db:migrate`. This applies the committed Drizzle migration and `supabase/policies.sql`, including RLS and the public image bucket. The script requires a **Supabase** database because it references `auth.uid()` and `storage.objects`.
5. Create a user in Supabase Authentication (or sign up at `/login`, confirm the email, and sign in). Copy that user's UUID into `SEED_USER_ID`.
6. Run `npm run db:seed`. The seed creates the deployed component catalog, a demo café, a published homepage, five categories, and six menu products. The existing Supabase user owns the café. The seed is repeatable and does not reset edited listings or existing café content.
7. Run `npm run dev`, open `http://localhost:3000`, and sign in with that user's email/password. Visit `/sites/bloom-cafe` to see the seeded public site.

Run the catalog seed before onboarding other accounts. A new account can create its own café and website from `/dashboard`; its homepage begins as a private draft. No user receives administrator access automatically.

### Environment variables (manual configuration)

| Variable                        | Purpose                                                                                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | **Secret, server-only.** Supabase Postgres connection URI, including your database password. Percent-encode special password characters. Never prefix this variable with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL.                                                                                                                                                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The project's public anon key (or compatible publishable key). Protected resources remain covered by RLS.                                                                                |
| `NEXT_PUBLIC_APP_URL`           | Your app origin, documented for deployment/auth configuration.                                                                                                                           |
| `SEED_USER_ID`                  | Existing confirmed Supabase Auth user UUID; seed tooling only.                                                                                                                           |

The application does not need a Supabase service-role key. Never put a service-role key in the browser or commit `.env.local`. `DATABASE_URL` is privileged: all application database access goes through server-only modules and explicit tenant checks. Use a dedicated database user with only needed privileges for a production deployment; run migrations separately as the owner.

## Working flows

- **Authentication:** email/password sign-up, confirmation, sign-in and sign-out; server-validated sessions and refresh cookies through Next.js Proxy.
- **Merchant workspace:** overview, page creation, visual editor, menu manager, component store, unlocked collection, media library and business settings; responsive sidebar and light/dark appearance.
- **Editor:** add, delete, drag or keyboard reorder, hide/show and select sections; change design variants, text, image uploads/URLs, button links, navigation links, colors, alignment and spacing. Preview desktop/tablet/mobile using the public renderer. Save drafts, restore the saved draft, and publish explicitly. The unsaved indicator and browser unload guard help prevent lost changes. Save first before using the global preview button, which previews the saved draft; the editor canvas previews current changes immediately.
- **Public sites:** `/sites/[slug]` and `/sites/[slug]/[page-path]` render only the published layout. SEO title/description use page/business information. Menu sections show currently available merchant products. WhatsApp ordering uses the configured business number. Menu and business data update live independently of design publication.
- **Store:** category filters/search, component previews and clearly labeled DEMO unlocks. No payment processing or payment credentials. Entitlements persist per merchant. Use design applies the component to a matching draft section, or adds a new section when needed. You can also change variants within the editor. Prices are illustrative USD; café menu prices use MYR in integer sen.
- **Menu:** category creation/rename/deletion, product creation/edit/deletion, image uploads, ordering and visibility. A category containing products cannot be deleted until its products are moved or removed.
- **Media:** validated JPEG, PNG and WebP uploads up to 5 MB. Copy an uploaded URL into a section or product. The bucket is public because these images appear on public websites; uploaded media is not confidential.
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

The registry resolves `(key, version)` to trusted React code. Version 1 uses an explicit Zod settings schema with defaults for every design. New incompatible versions must add their own implementation/schema and migration rather than modifying old configuration in place. Keep old registry versions available for published snapshots. `component_versions` stores schema metadata; merchant JSON never contains executable code. Unknown/deleted versions render a safe unavailable section. Existing registered versions are intentionally not automatically migrated.

### Verification and limits

Automated tests cover component/schema selection, entitlement enforcement (including hidden sections), safe URLs, unauthorized tenants, tenant-owned page/category checks, concurrent revisions, draft/published separation, publish revisions and admin denial. The database suite executes both committed migrations and the RLS SQL in embedded PostgreSQL (PGlite), verifying tenant reads, denied role/entitlement writes, anonymous denial, composite tenant foreign keys and storage path authorization. Supabase's host auth/storage schemas are stubbed for these tests. Server-action tests use mocked database/auth boundaries; these checks do **not** replace an integration check against your actual Supabase project.

Verification in this workspace: 27 tests passed, strict TypeScript (including unused-symbol checks) passed, ESLint passed, and the Next.js production build passed. A production HTTP smoke test verified the login page and confirmed signed-out dashboard/admin requests redirect to login without rendering protected content. Browser visual/interaction testing was not available. `npm audit --omit=dev` reported zero production advisories. The full audit reports 12 moderate development-tool advisories through Drizzle's old esbuild loader and ESLint's transitive minimatch dependency. The suggested forced fixes downgrade major tool versions; they were not applied. These packages are development-only; do not expose development tooling as a public service.

After configuration, test with two separate confirmed accounts: create separate merchants, edit/save/publish a page, unlock a premium design, upload an image, add a menu product and inspect the public route. In Supabase, verify an authenticated user cannot read the other tenant's rows or write profiles/entitlements directly. Check logged-out `/admin` and non-admin access, then promote a test administrator and update a listing. Try a stale editor tab to confirm revision protection.

Supabase integration, RLS execution, email delivery and real browser interaction require your configured environment and are not claimed by a credential-free build. No online payments, custom domains, POS, team invitations, analytics, billing or automated version migration are implemented. Complete themes are explicitly marked as future functionality. Production hosting should use a Next.js-compatible Node runtime with the server-only environment variables configured; this repository does not publish a static substitute through Sites.
