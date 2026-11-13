# POS / Cashier and Orders

## Two-device use

Sign in on each device using the same SERVQO business account. Open `/dashboard/pos` on the cashier device and `/dashboard/orders` on the kitchen device. Each device needs its own initial sign-in. Supabase allows multiple sessions by default; leave any project-level single-session-per-user restriction disabled. The application does not restrict a user to one device. Sign-out now uses Supabase's local scope so it does not revoke the other device's session.

The screens fetch authenticated snapshots approximately every three seconds while visible. Actual update latency also includes the request time. They refresh after actions, on focus and when reconnecting. They pause while hidden, avoid overlapping requests and explicitly display sync failures. A closed, offline or sleeping kitchen screen cannot receive an immediate update; staff should also communicate urgent cancellations directly.

## Cashier

The catalog comes from Menu Management and uses its existing categories, availability, prices and images. Unavailable products cannot be submitted. A bill supports dine-in/takeaway, an optional table/reference and kitchen note, quantities, manual cash received/change, or payment due. Tax, discounts, stock deductions, card gateways and automatic refunds are not included in this release.

A draft stays on this browser tab across reloads using session storage. Clearing an unsent draft does not affect the kitchen. No offline submission is claimed: the Send button requires a successful connection. Once submission starts, the request ID and bill are retained until success or a definite validation failure. If the response is lost, retrying uses the same request ID. The server returns the existing ticket rather than creating another; a matching ticket found during sync also lets the cashier start the next bill safely.

The server validates permissions, subscription, current availability and prices; the client cannot choose an arbitrary total. Items retain name/price snapshots even if products are later edited or deleted. Per-business order numbers are allocated within the same transaction as the order, items and initial event. Failed transactions do not leave partial tickets.

## Kitchen and cancellations

Tickets move through Pending → Preparing → Ready → Completed. Each status change checks the current version inside a transaction. If both devices change the same ticket, a stale change is rejected and the client reloads the latest status. Completed and cancelled tickets cannot be reopened.

The cashier can cancel Pending, Preparing or Ready tickets with a reason. The kitchen sees a prominent Stop preparation notice. This notice remains in the live queue until someone acknowledges it, even if cancellation happened before the kitchen's first poll. Acknowledgement moves the cancelled ticket into history; it does not delete it. Activity records are append-only. Cancelling a ticket with recorded cash reminds the cashier to handle any refund separately.

The recent history shows the latest 50 completed/acknowledged tickets. Active tickets and unacknowledged cancellations are not capped by that history limit. All records remain in PostgreSQL and are included in the existing business export. Reading orders, cancelling mistakes and acknowledging cancellations remain possible after subscription expiry; creating and advancing orders require an active trial/subscription.

## Migration and deployment

Review `drizzle/0003_pos_orders.sql` and its generated snapshot. This additive migration creates four tables, their indexes/constraints, tenant read policies, and an append-only event trigger. It does not reset or delete existing records. Browser roles cannot directly write orders; server actions retain the authentication/capability checks. The order-counter table has no visible rows under the browser policy.

Apply through the existing controlled migration workflow, then deploy:

```powershell
npm.cmd run db:migrate
npm.cmd run db:check
```

The migration command also reapplies the existing application/storage policies and catalog registration, as documented in `DEPLOYMENT.md`. It requires the configured direct/session migration connection. It is not part of the Vercel build. Until migration is applied, POS/Orders display a setup message; other Dashboard modules do not query these new tables.

Category Management was removed from the Maintenance menu. The old `/dashboard/maintenance/categories` URL redirects to Menu Management, where categories are still managed.

## Verification

Regression tests exercise real migrated PostgreSQL for atomic creation, idempotent retries, price/availability validation, subscription enforcement, snapshot preservation, stale updates, cancellation acknowledgements, tenant RLS, browser write denial and immutable events. Endpoint tests cover session expiry, permission failures and no-store responses. A two-context browser test uses the real service with an isolated PostgreSQL database and simulated authentication; it does not verify a production Supabase account's session settings.
