# Vercel + Supabase deployment

This application needs a Next.js Node server, PostgreSQL, Supabase Auth and Storage. It is not a static export. No deployment or database migration was performed during this review.

## Current verification

Local validation passed: TypeScript, ESLint, all 46 automated tests (including embedded PostgreSQL security checks), and `npm run build`. Production compilation does not establish that live database setup or email confirmation is complete.

The read-only local-environment check on 11 November 2026 connected to Supabase successfully with certificate verification enabled. It found **0 of 14 application tables**, no Drizzle migration ledger, and no `merchant-media` bucket. The Auth settings endpoint responded successfully. This verifies connectivity, not login, email delivery or an end-to-end application flow. Database setup is still required. Vercel's saved environment values and Auth dashboard URL settings were not inspected.

## Environment variables

Keep local credentials in the repository-root `.env.local`, which is git-ignored. `.next/.env.local` is generated-directory content and is not the application's environment configuration. Never commit either file or paste connection strings into logs. Vercel variables must be configured separately in Project Settings → Environment Variables.

| Variable                               | Where and purpose                                                                                                                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                         | Required server-only runtime PostgreSQL URI. Use the Supabase transaction pooler on port 6543 for Vercel. Password characters must be URI-encoded. Prepared statements are disabled.            |
| `NEXT_PUBLIC_SUPABASE_URL`             | Required project API URL.                                                                                                                                                                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Preferred public key. Used by both server and browser-safe Supabase configuration.                                                                                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Legacy alternative, only required if the publishable key is absent. Publishable takes precedence.                                                                                               |
| `NEXT_PUBLIC_APP_URL`                  | Set to the actual production HTTPS origin, with no path. Example only: `https://saas-website-builder.vercel.app`; confirm the assigned domain in Vercel. Used for confirmation email redirects. |
| `MIGRATION_DATABASE_URL`               | Local or controlled CI tooling only. Direct/session connection on port 5432 from Supabase's Connect panel, targeting the same project/database. Not needed by the deployed app.                 |
| `SEED_USER_ID`                         | Optional demo-seed tooling only: existing confirmed Auth user's UUID.                                                                                                                           |
| `VERCEL_URL`                           | Automatically supplied by Vercel; HTTPS origin fallback when `NEXT_PUBLIC_APP_URL` is absent, useful for previews.                                                                              |

No service-role/secret Supabase API key is needed. Never use one in a `NEXT_PUBLIC_` variable. Public variables are embedded at build time, so redeploy after changing them. Node 22.x is configured in `package.json` and `.nvmrc`.

The local review found runtime database, API URL and publishable key configured. `MIGRATION_DATABASE_URL` and `NEXT_PUBLIC_APP_URL` were absent. The missing anon key is fine. Local development can use a localhost origin fallback; production must have the canonical origin or Vercel's automatic URL.

## Database setup — review before execution

The merchant trial/subscription extension adds a third migration and four tables (18 application tables total). Review [the subscription migration and rollout notes](docs/SUBSCRIPTIONS.md) before applying it; existing merchant trials use original creation dates and can already be expired. This extension has not been applied to the live database during implementation.

Run these commands from the repository root on your development machine or in one controlled migration job, not as the Vercel build command. Windows PowerShell commands are shown; `npm` also works on other platforms.

```powershell
# Only for a fresh checkout or changed dependencies:
npm.cmd ci
# Redacted checks; db:check only reads data and configuration:
npm.cmd run env:check
npm.cmd run db:check
```

First add `MIGRATION_DATABASE_URL` to root `.env.local` using the project's direct or session-pooler connection from Supabase Connect. Direct connections require suitable IPv6 networking; use the session pooler if unavailable. Transaction port 6543 is rejected for migration tooling. Do not put credentials in the command itself.

**The migration command, pending your review, is:**

```powershell
npm.cmd run db:migrate
```

It performs these writes:

1. Applies `drizzle/0000_strong_pretty_boy.sql` and `0001_grey_avengers.sql` through Drizzle's migration ledger. They create 14 application tables, relationships and indexes, including composite tenant constraints. Supabase-managed Auth/Storage tables are not reset.
2. Applies `supabase/policies.sql` in a transaction: enables application RLS, revokes browser-role table privileges, grants scoped authenticated reads, and replaces the named application/storage policies and membership helper. Browser writes to application tables remain denied; server actions enforce tenant and role permissions.
3. Creates or updates the public `merchant-media` image bucket and its tenant upload/read/delete policies. Bucket configuration allows JPEG/PNG/WebP up to 5 MiB; the application imposes a stricter **4 MiB** request limit for Vercel compatibility. These are public website images, not confidential documents.
4. Registers missing component definitions, versions and store entries without replacing merchant content, entitlements, prices or existing listings.

The scripts do not reset the database, drop application tables or delete merchant records. Policy replacement and privilege revocation can affect other consumers of these same tables; review the SQL if sharing a project. Schema migrations, policy installation and catalog registration are separate stages; a later failure can leave earlier stages complete. Inspect the error and rerun after fixing it. Do not delete migration records or use destructive resets to resolve errors.

Then verify:

```powershell
npm.cmd run db:check
```

This checks table/column presence, RLS, constraints, indexes, migration hashes, catalog versions, bucket and named policies without writing data. It exits nonzero for incomplete setup. Optional `npm.cmd run db:seed` creates a demo café owned by `SEED_USER_ID`; it is not required for production onboarding. Do not run it unless you want demo content.

## Supabase Auth configuration

Enable email/password authentication. In Authentication → URL Configuration:

- Set **Site URL** to the actual production HTTPS origin.
- Allow the exact `https://YOUR_DOMAIN/auth/confirm` redirect URL, and the corresponding localhost URL for development if needed.
- For previews, allow only your project's preview domains. Avoid a wildcard covering every Vercel customer's deployments. Leave `NEXT_PUBLIC_APP_URL` unset in Preview to use that deployment's automatic `VERCEL_URL`, or configure an explicit approved preview origin.

Sign-up supplies the complete `/auth/confirm` redirect URL. For the Confirm signup email template, the direct SSR token link can be:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email"
  >Confirm your email</a
>
```

Do not append `/auth/confirm` a second time. The handler also supports PKCE `code` callbacks, exchanges the token for an SSR cookie session, and permits only local redirect destinations. Existing email delivery/SMTP configuration must be tested manually. Protected loaders/actions validate the Auth user server-side; merchant membership and administrator role checks remain in place. Never grant administrator privileges through user-editable metadata.

After registration, `/signup/check-email` opens an accessible inbox reminder popup. Custom-template `token_hash` links open `/auth/confirm`, which redirects to `/auth/verify` without consuming the token. Only the Activate account button submits that token for verification. With the default Supabase email, Supabase has already verified the email before redirecting with a PKCE `code`: the callback exchanges this code immediately, without a second activation button. Older `/auth/verify?code=...` links route back to the same callback. A failed PKCE exchange offers password sign-in instead of incorrectly declaring the email unverified. Successful token verification or code exchange redirects to `/auth/confirmed`, which validates the confirmed user through Supabase before showing activation success. Confirmation does not load merchant database records until the user continues to the workspace.

Onboarding creates the merchant, trial/subscription, owner membership, starter website, private homepage and five menu categories in one transaction, then redirects to the dashboard. It does not publish the website. The form shows a pending state and safe inline errors for missing migrations, duplicate website addresses and connectivity failures. The merchant timestamp mapping contains only one `created_at` field: it is not reused as an update timestamp. This mapping correction requires no additional schema migration. A database still on two migrations cannot create subscription-enabled workspaces; review and apply the pending migration as described in `docs/SUBSCRIPTIONS.md` before deploying that feature.

For local development on port 3000, use Site URL `http://localhost:3000` and allow `http://localhost:3000/auth/confirm`. If running a different port, set `NEXT_PUBLIC_APP_URL` to that local origin and allow its callback URL. Use `npm run dev` for local HTTP; production mode requires an HTTPS app origin. After changing the email template or redirect allowlist, register a test account or request a fresh email; old links retain their original destinations. Never share the full confirmation URL, token, or auth code in logs/screenshots.

## Deploy manually from GitHub

1. Review and commit the intended code changes to `SOSADKUN/SAASWebsiteBuilder`, including the lockfile, migrations and deployment helpers. Check `git status` and ensure credentials are excluded. No commit or push was made by this review.
2. In the existing Vercel project `saas-website-builder`, connect that repository and select the intended branch and repository root.
3. Use the Next.js preset, Node 22.x, install command `npm ci`, build command `npm run build`, and the default Next.js output configuration. Do not configure a static export or migrations in the build command.
4. Configure the required runtime variables for Production. Configure Preview separately, preferably with a separate Supabase environment to avoid test writes to production.
5. Complete the reviewed database setup and Auth URL configuration, then initiate deployment yourself. Confirm the assigned domain and update the canonical origin/allowlist if needed; redeploy after public-variable changes.

Runtime database access stays in server-only Node modules. Images upload directly through server-side Supabase Storage integration; local disk is not used for persistent uploads. Bundled demo images and fonts ship in `public/`. No localhost service is required in production.

## Verify the live deployment

- Register, receive the confirmation email, follow it, sign out and sign in again. Refresh protected pages and check signed-out access redirects to login.
- Create a merchant, open the editor/gallery and save a draft. Confirm the public route remains unchanged until Publish, then verify `/sites/[slug]` and any published subpage.
- Upload a JPEG/PNG/WebP below 4 MiB, select it and check its public image URL. Test menu editing and demo component entitlements.
- Use a second account to verify merchant isolation, denied administrator access and revision conflict handling in stale editor tabs. Do not promote production users merely to test access.
- Check Vercel function logs for failures without sharing tokens, passwords, connection strings or confirmation URLs. Future POS/payment modules should remain unavailable.

## Troubleshooting

| Symptom                                            | Action                                                                                                                                                                       |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing Supabase configuration                     | Supply API URL and publishable or legacy anon key, then rebuild. Never use a secret/service-role key.                                                                        |
| Missing tables or migration ledger                 | Review and run `db:migrate` against the correct project, then `db:check`.                                                                                                    |
| Migration refuses port 6543                        | Set `MIGRATION_DATABASE_URL` to direct/session port 5432; keep runtime transaction pooling.                                                                                  |
| Authentication failure connecting to PostgreSQL    | Copy the correct pooler username/connection mode and URI-encode the password. Check paused-project/network status.                                                           |
| TLS certificate failure                            | Verify the endpoint and the bundled public Supabase CA in `src/lib/supabase-ca.ts`; update it from Supabase if certificates change. Do not disable certificate verification. |
| Existing relation / mismatched migration hash      | Inspect the schema and ledger before proceeding. Do not drop tables, clear the ledger or baseline an unknown database blindly.                                               |
| Invalid/expired confirmation or wrong domain       | Check Site URL, exact redirect allowlist, email template and deployment origin. Request a fresh email; PKCE codes also require the initiating browser's cookies.             |
| Upload 413 / upload denied                         | Keep files below 4 MiB; verify bucket and tenant storage policies were installed. Vercel requests have a 4.5 MB platform limit.                                              |
| Draft conflicts                                    | Reload to obtain the current saved revision before saving again.                                                                                                             |
| Environment changed but app still uses old project | Redeploy after changing build-time public variables.                                                                                                                         |

References: [Supabase Drizzle configuration](https://supabase.com/docs/guides/database/drizzle), [connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres), [Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Vercel function limits](https://vercel.com/docs/functions/limitations).

## SERVQO production confirmation checklist

For `https://servqo.vercel.app`, set Supabase Site URL to that exact origin and allow `https://servqo.vercel.app/auth/confirm` as a redirect URL. In Vercel Production, set `NEXT_PUBLIC_APP_URL=https://servqo.vercel.app`; remove any localhost value there and redeploy.

For a production-only Confirm signup email, use this direct application link (not `ConfirmationURL`, which verifies at Supabase before showing the application page):

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
  >Activate your SERVQO account</a
>
```

The existing `RedirectTo` template above also works when its supplied application origin is correctly configured and allowlisted. Keep the Email provider and Confirm email enabled. Deploy the click-to-activate code before testing and request a fresh confirmation email. Existing emails retain their old destinations and may already be expired/used. No database migration or service-role API key is required.
