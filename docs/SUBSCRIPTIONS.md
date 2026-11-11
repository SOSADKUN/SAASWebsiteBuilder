# Merchant trials and subscription foundation

## Migration review and rollout

**The migration is prepared locally, not applied to Supabase.** Review `drizzle/0002_third_gargoyle.sql` before changing the live database. The two existing migrations are unchanged. No payment service, account purchase, deployment, or live subscription activation is part of this change.

Changes:

- Add non-null `merchants.trial_started_at` and `trial_ends_at` as PostgreSQL `timestamptz`. New merchant creation uses database time and exactly 336 hours (14 × 24 hours). An update trigger prevents these dates from being reset by business edits or future staff workflows.
- Backfill existing merchants from their **stored `created_at`**, with end time 336 hours later. This preserves historical creation and avoids granting fresh trials during rollout. **Existing businesses older than 14 days become restricted immediately** unless they have verified paid access. Review that effect before applying.
- Add `subscription_plans`, seeded with a single SERVQO Standard plan. No invented price or actual payment method is attached.
- Add one `merchant_subscriptions` row per merchant, referencing a plan, with constrained statuses `trialing`, `active`, `past_due`, `canceled`, `expired`. Paid access requires `active`, a server-verified source (`provider` or trusted `admin`), a verification timestamp not in the future, and a paid period ending after database time. Merely selecting a plan or unlocking a demo component never creates paid access.
- Add append-only `subscription_events`. Bootstrap/backfill and meaningful subscription changes are logged by database triggers. Changes to a subscription's status, plan, payment verification or period produce an audit event.
- Add append-only `merchant_trial_claims`, keyed by the authenticated subject UUID, with the original merchant ID. Backfill each existing owner's earliest merchant claim. Claims deliberately have no Auth-user foreign key and are not erased by deleting an Auth user. Their merchant reference also prevents accidental deletion of a claimed business without a deliberate retention-policy change.
- Add tenant-scoped read RLS and revoke browser-role writes on all four tables. Browser clients cannot grant paid status, change plans or extend trials. Trial dates are immutable even through normal privileged merchant update queries.
- Add a membership-scoped SQL subscription helper and update the media INSERT policy so direct Supabase Storage uploads cannot bypass expiry checks. Storage reads stay available after expiry.

No existing merchant, website, menu, media, entitlement or Auth record is deleted. No migration reset or baseline change is required. New merchant subscription initialization is transactional with merchant insertion. The account claim is also inserted in the business-creation transaction, so a conflicting/repeated claim rolls back the new business and its initial subscription/event.

Before rollout, take the normal database backup/snapshot for your environment, review which merchants will already be expired, and arrange a controlled migration window. Do not run application code requiring these tables before migration completion.

After review/approval, run from the repository root with the existing ignored local environment file. `MIGRATION_DATABASE_URL` must target the same database as runtime and use a direct/session connection, not transaction port 6543:

```powershell
npm.cmd run db:migrate
npm.cmd run db:check
```

`db:migrate` applies the pending schema migration, reapplies Supabase access/storage policies, and registers missing catalog entries. It does not reset tables. The expected result afterward is 18 application tables, 3 applied migrations, the existing component versions and `"issues": []`. The checker now also verifies the subscription helper and lifecycle triggers. Do not deploy until that check succeeds. No migration was run against the live database during implementation.

Do not roll back by deleting tables or migration records. If a deployment needs reverting, preserve the additive schema/data, assess the storage policy dependency, and use a reviewed forward fix. The new checks deliberately fail closed if a subscription row is missing.

## Access policy

The subscription is attached to the merchant. Team membership, email changes, signing in and editing business details do not change the trial. Staff invitations are still a future module; adding a membership directly does not reset dates or create another subscription.

Server actions first authorize the tenant and capability, then load fresh subscription eligibility using PostgreSQL time. Website save/publish, page creation, menu/category mutations, media upload and demo component unlock require a valid trial or verified active subscription. Browser visibility is not the security boundary. Current role permissions still apply independently of billing.

After expiry, members can still log in and read the dashboard, saved pages, products, media and business information. Authorized members can update business details, open Subscription & Billing and export saved data at `/dashboard/export?merchantId=UUID`. Public sites remain published. The JSON export is tenant-authorized, read-only, non-cached, and includes business data, layouts, revisions, menu, media URLs, component entitlements and subscription history. Original binary images must be downloaded separately. Unsaved editor state is not exported.

The billing page shows status, remaining days, UTC start/end timestamps and paid-period end if present. Remaining days are rounded up from database time. The page states when it was checked; refresh for a new snapshot. Action authorization always rechecks server time, even if an old browser view still shows time remaining. Effective expiry is computed at request time and does not depend on a scheduled job updating stored `trialing` rows. A stored `active` row with an elapsed paid period is also effectively expired. Past-due/canceled subscriptions have no paid grace period in this version; a still-valid original trial remains usable until its own end.

The Upgrade / Subscribe button only reveals a **payments-not-connected** message. No payment is collected, no subscription is activated, and no client-provided status or dates are trusted. Existing demo component entitlement rules are unchanged.

## Abuse prevention and limits

The public business-creation action grants at most one trial business per authenticated subject ID. A unique durable claim handles concurrent attempts and persists if membership is removed or the account's email changes. Employee membership does not claim a new trial for that business. Existing owners with multiple historic businesses keep their data; the earliest claim prevents further self-service trials.

This is basic account-level prevention, not proof that two separately registered Auth identities represent the same person. Deleting and recreating an Auth account creates a different UUID. Preventing that or coordinated multi-account abuse needs additional trusted identity/business verification and risk signals; matching email strings alone is insufficient. Such checks and multi-business paid onboarding are not implemented here. No destructive cleanup is used as a billing mechanism.

## Remaining payment integration

Before accepting money, implement server-controlled plan pricing/currency and a provider adapter; authenticated owner-only checkout/portal actions; webhook signature validation; unique provider customer/subscription/event identifiers; idempotent transactional event handling; verified period/status transitions; cancellation/refund/dunning rules; and reconciliation of missed webhooks. Never activate from a checkout return URL or a client button. Add webhook tests for duplicate, delayed and out-of-order events and tenant ownership.

The current `admin` verification source reserves a trusted operational path, not a merchant-facing action. Any future manual billing override needs explicit platform-admin authorization and actor/reason audit data. Customer billing-management actions must be separated from staff read permissions. Production database access should be granted only to controlled server processes; no privileged Supabase API key is needed in the browser.

## Validation

Tests cover exact expiry, remaining-day rounding, verified paid periods, all restricted server actions, missing-subscription denial, merchant isolation, export after expiry, first/repeated trial claims, historical backfill, automatic initial subscription/event creation, immutable dates/history, browser write denial, and direct storage expiry enforcement. SQL tests apply all migrations and policies to isolated embedded PostgreSQL, not your hosted Supabase database.

Implementation verification passed: 81 tests, TypeScript, ESLint, production build and Drizzle snapshot/schema comparison. The actual billing component was also rendered with synthetic trial/expired data at 1280, 390 and 320 pixels with no horizontal overflow. Hosted end-to-end verification remains pending the reviewed live migration.
