# Free Core and System Services access

Current reference: [Project Guide](SERVQOO_PROJECT_GUIDE.md). This focused document describes the Phase B policy. Earlier audit/phase reports describe their historical implementations; the current contract is below. See [archived Phase B report](archive/SERVQOO_PHASE_B_REPORT.md) for rollout and rollback dependencies.

## Permanent Free Core

Authenticated, authorized company owners retain Dashboard, basic business/profile/settings, product/category catalog, media within Company Storage Quota, basic website draft editing/publishing, service discovery, billing information and JSON export after trial expiry. Existing role restrictions still apply; free access does not grant staff new capabilities. No account-management, employee or custom-domain module is introduced.

One free website means one `websites` property per `merchant_id`, enforced by its existing unique constraint. Multiple pages remain supported. Existing `/sites/[slug]/...` URLs, published content and design ownership remain unchanged. Premium designs still need separate component entitlements. New demo design unlocks retain their existing explicit subscription gate; Free Core does not grant premium ownership. No new page-count cap is imposed. Existing input/layout limits and 20 MiB free storage are enforced; broader fair-use/rate limits and premium custom-domain features remain future policy/work.

## One-time service trial

`merchant_module_trials` records explicit company/module authorization for POS, F&B Orders and Kitchen Queue. Each row exactly matches immutable merchant trial start/end dates. Merchant creation initializes these records transactionally; migration 0008 backfills the original dates, including already expired companies. Module selection never restarts the clock. The existing 14-day timestamps and durable one-trial claim per Auth subject remain.

The existing onboarding wizard recommends by business type; View all allows compatible implemented services such as product-only POS for salons. Appointments and other Coming Soon services stay unavailable. Selecting no optional services is valid: all six Core modules stay included. Existing completed merchants do not repeat onboarding. Owner-only service configuration persists without deleting content. Dependencies and operational-data confirmation still apply.

Paid service access requires BOTH configuration/availability/dependencies and either a current explicit trial or a company-specific verified service entitlement. Old `included`/`legacy` rows are preserved for provenance but do not constitute permanent paid authorization. A verified row requires `source=provider|admin`, non-future `verified_at`, and future `expires_at`. A base subscription alone does not license services. No gateway, paid issuance endpoint, renewal job, automatic billing or paid activation is implemented.

## Expiry and unfinished tickets

Enabled operational services remain visible with a History badge after expiry. Their data is tenant/role protected. New POS tickets are denied by the server; UI shows why. Exact retry of an already committed request UUID/fingerprint returns the existing ticket after expiry, allowing uncertain submissions to reconcile. Reusing that UUID with changed contents remains rejected.

Existing tickets can progress pending -> preparing -> ready -> completed after expiry, or pending -> cancelled with a reason. Cancellation acknowledgement remains available. Tenant authorization, role capabilities, legal transitions, expected versions and audit events remain required. No new items/payments/order totals are added through these paths. Active tickets and unacknowledged cancellations must be resolved before disabling operational services. Disabled services retain database data/export but hide their screens until authorized reactivation.

Monthly recorded cash counts completed cash tickets only. Gross completed totals are separately labelled and include unpaid tickets. Cash is manually recorded, not provider-reconciled accounting revenue; no settlement/refund ledger is claimed.

## Database and Storage boundaries

Server module state uses PostgreSQL time and actual company trial/license rows, never a client trial flag. Missing module tables/columns fail normally; there is no 42P01 fallback. SQL separates retained reads (`has_business_module`) from starting operations (`can_use_business_module`); capability checks remain separate. Authenticated browser application writes remain revoked. Trial rows are immutable and only tenant-readable; authenticated clients cannot issue licenses or extend dates.

Phase A quota/reservation enforcement and public media URLs remain. Free capacity is 20 MiB; original trial window grants 50 MiB; only separate verified Storage entitlement grants 100 MiB. Service licenses do not increase storage. Expiry never deletes images: over-quota companies can remove images but cannot upload until capacity permits. Base permissive Storage policies no longer impose a merchant subscription gate; the Phase A restrictive policies still deny direct browser mutations, and server uploads validate/authorize/reserve capacity.

## Deployment boundaries

Review the actual environment and migration journal first. Ordered prerequisites: 0005 multi-industry foundation -> 0006 onboarding -> 0007 company storage quota plus Phase A server-only Storage key and matching policy bundle -> 0008 permanent free Core plus current policy bundle/catalog. Current `db:migrate` applies every pending migration, then base and rendered quota policies together, then catalog. Never use it blindly to repair production 0005/0006 in isolation.

Test the full bundle on staging before a separately approved production maintenance/code rollout. No external migrations or policies were applied during Phase B. Preserve additive schema, trial rows and provenance on rollback; do not delete data or migration journal entries. Older application/policy versions can restore obsolete subscription gates, so rollback needs coordinated review.

Hosted login, actual devices, live Supabase Storage and production migration acceptance remain separate validation. Disposable PostgreSQL tests are not production evidence. Multi-company switching, employee invitations and payment integration remain future work.
