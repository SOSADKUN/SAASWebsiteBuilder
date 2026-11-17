# SERVQOO

A modular workspace for small businesses, with a public website builder, basic company/catalog tools and product pickup POS with a staff order queue.

**Start here:** [SERVQOO Project Guide](docs/SERVQOO_PROJECT_GUIDE.md) is the primary current documentation. See [deployment requirements](DEPLOYMENT.md), [public/domain preparation](docs/PUBLIC-GO-LIVE.md) and the [historical archive](docs/archive/README.md).

## Current functionality

- Supabase signup/verification/login, company onboarding and role/tenant checks.
- Permanent Free Core: Dashboard, company profile, basic catalog, quota-limited media and one multi-page website with draft/publish.
- Product POS and staff Orders/Kitchen Queue with company-level trial/license checks, safe cancellation and online polling.
- Image optimization, validated uploads, storage quotas and confirmed deletion.
- Public landing/pricing/demo/contact configuration and purchase previews.

Payments are disconnected; checkout stays disabled and prices are proposed. Appointments, custom cake pre-orders and staff scheduling remain Coming Soon. Legal pages are drafts. Hosted acceptance remains separate from passing local tests.

## Stack

Node 22, Next.js App Router, React, strict TypeScript, Tailwind/CSS, Supabase Auth/PostgreSQL/Storage, Drizzle/Postgres.js, dnd-kit, Zod and Sharp. Vitest/PGlite provide automated coverage.

## Local setup

For a fresh checkout with a dedicated development Supabase environment:

```powershell
npm.cmd ci
Copy-Item -LiteralPath .env.example -Destination .env.local
npm.cmd run dev
```

Do not overwrite existing local configuration. See the [guide's environment and migration workflow](docs/SERVQOO_PROJECT_GUIDE.md#16-environment-variables-names-and-purposes-only) before using authenticated features. Seed is optional; do not use it as a repair.

## Quality checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --silent --maxWorkers=2 --testTimeout=30000
npm.cmd run build
git diff --check
```

**Deployment warning:** the reported production `dashboard.load/modules/42P01` remains unresolved here. This working tree needs migrations through 0008 plus matching policies/catalog and the server Storage key. `db:migrate` applies all pending changes, not just 0005/0006. No automatic deployment or production database action is authorized by these setup instructions. Keep `.env.local` and credentials untracked.
