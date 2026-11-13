# POS / Cashier and Orders

## Two-device use

Sign in on each device using the same SERVQO business account. Open `/dashboard/pos` on the cashier device and `/dashboard/orders` on the kitchen device. Each device needs its own initial sign-in. Supabase allows multiple sessions by default; leave any project-level single-session-per-user restriction disabled. The application does not restrict a user to one device. Sign-out now uses Supabase's local scope so it does not revoke the other device's session.

The Orders screen fetches authenticated snapshots approximately every three seconds while visible. POS automatically refreshes while its recent-tickets section is in view, and while confirming an uncertain submission; its initial load, explicit refresh, successful actions and reconnects can also fetch a snapshot. Actual update latency also includes the request time. They refresh after actions, on focus and when reconnecting. They pause while hidden, avoid overlapping requests and explicitly display sync failures. A closed, offline or sleeping kitchen screen cannot receive an immediate update; staff should also communicate urgent cancellations directly.

## Cashier

The catalog comes from Menu Management and uses its existing categories, availability, prices and images. Unavailable products cannot be submitted. New cashier bills use counter pickup with no table selection. A bill supports an optional kitchen note, quantities, manual cash received/change, or payment due. Existing dine-in tickets remain readable and an uncertain legacy bill retains its original fulfillment when retried. Tax, discounts, stock deductions, card gateways and automatic refunds are not included in this release.

A draft stays on this browser tab across reloads using session storage. Clearing an unsent draft does not affect the kitchen. No offline submission is claimed: the Send button requires a successful connection. Once submission starts, the request ID and bill are retained until success or a definite validation failure. If the response is lost, retrying uses the same request ID. The server returns the existing ticket rather than creating another; a matching ticket found during sync also lets the cashier start the next bill safely.

The server validates permissions, subscription, current availability and prices; the client cannot choose an arbitrary total. Items retain name/price snapshots even if products are later edited or deleted. Per-business order numbers are allocated within the same transaction as the order, items and initial event. Failed transactions do not leave partial tickets.

Both screens have a Full Screen toggle beside connection status. It displays only
that workspace, hiding the application navigation and header; Exit Full Screen is
red. The browser Fullscreen API is used when supported, with an in-page viewport
fallback for unsupported browsers. Escape exits; leaving restores body scrolling.
Recent POS tickets use a horizontal slider with previous/next controls and a Show
all tickets grid. The list contains all active tickets and the latest 50 closed
tickets already supplied by the snapshot, rather than the previous eight-ticket
cutoff. Full historical records remain in the export.

## Kitchen and cancellations

Tickets move through Pending → Preparing → Ready → Completed. Each status change checks the current version inside a transaction. If both devices change the same ticket, a stale change is rejected and the client reloads the latest status. Completed and cancelled tickets cannot be reopened.

The cashier can cancel Pending tickets with a reason. Once the kitchen marks a ticket Preparing or Ready, cancellation is blocked in both the cashier UI and server transition policy. A stale cashier action is rejected under the ticket row lock. The kitchen sees a prominent Stop preparation notice. This notice remains in the live queue until someone acknowledges it, even if cancellation happened before the kitchen's first poll. Acknowledgement moves the cancelled ticket into history; it does not delete it. Activity records are append-only. Cancelling a ticket with recorded cash reminds the cashier to handle any refund separately.

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

## Investigating slow sends

Order creation logs `pos.order.create` with one correlation reference and separate
`authorization`, `subscription`, `database_transaction` and overall `request`
durations. These logs contain no bill contents, credentials or customer IDs.
Authorization includes session verification and the current merchant membership;
database transaction timing includes pool acquisition, SQL, lock waits and commit.
It does not include browser-to-server travel or proxy session refresh.

Creation avoids three sequential SQL round trips: counter initialization and lock
use one upsert, while item snapshots, the initial event and counter advancement
use one parameterized statement. Permission, subscription, price, row-lock,
idempotency and rollback checks are retained. No schema migration is needed.

Check Vercel Project Settings → Functions → Function Region against the production
Supabase project's database region. Place the function near the database; do not
choose a region just because it is near the browser. The local connection was
observed in Sydney (`ap-southeast-2`, Vercel `syd1`); the production settings have
not been verified. Region changes require a new deployment. See
[Vercel region configuration](https://vercel.com/docs/functions/configuring-functions/region).

`npm.cmd run dashboard:diagnose` measures synthetic, read-only queries from the
machine running it, not from Vercel. On November 13, 2026, the configured local
probe measured about 460–490 ms for warm first-wave reads and about 2.07 s for
the initial connection/read. These are client-observed times, not PostgreSQL
execution times or production POS benchmarks. Correlate production timings before
attributing delays to Supabase compute or changing plans.

## Regression coverage

Regression tests exercise real migrated PostgreSQL for atomic creation, idempotent retries, price/availability validation, subscription enforcement, snapshot preservation, stale updates, cancellation acknowledgements, tenant RLS, browser write denial and immutable events. Endpoint tests cover session expiry, permission failures and no-store responses. A two-context browser test uses the real service with an isolated PostgreSQL database and simulated authentication; it does not verify a production Supabase account's session settings.
