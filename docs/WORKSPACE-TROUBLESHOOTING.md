# SERVQOO workspace diagnostics

Current policy/architecture: [Project Guide](SERVQOO_PROJECT_GUIDE.md). Earlier investigations are preserved in the [archive](archive/README.md), including [the timeout incident](archive/DASHBOARD-TIMEOUT.md) and [previous onboarding notes](archive/WORKSPACE_TROUBLESHOOTING_PRE_CONSOLIDATION.md). Historical timings do not prove current production conditions.

## Locate the failing request

Use the support reference shown in the workspace error. In Vercel Runtime Logs, confirm the correct project/production deployment, clear filters, choose the failure's time range and search that reference. Reproduce once if necessary. Compare stage `started`, `completed`, `failed` and allowlisted error codes/timings, not just repeated loading messages. Never paste cookies, tokens, customer records, SQL text or connection strings into support logs.

`dashboard.load` validates authentication/membership, then real module/company/subscription context and view-specific reads. A user without membership should reach setup. A failed module query is not evidence of absent merchant onboarding and must not be bypassed. Error UI replaces unresolved loading; retry does not prove the underlying cause is fixed.

| Code                         | Investigation                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `42P01`, `42703`             | Undefined relation/column: inspect actual deployment runtime target and migration state; no authorization fallback |
| `57014`                      | Statement cancellation, including server timeout; correlate database/provider logs                                 |
| `QUERY_TIMEOUT`              | Driver-bounded query/queue failure; inspect pool usage, locks, connectivity and workload                           |
| `55P03`                      | Lock timeout; inspect the blocking chain while the request is stalled                                              |
| `23505`                      | Unique constraint, such as an already-used website slug; preserve records                                          |
| `42501`                      | Permission mismatch; review intended roles/policies instead of granting blanket access                             |
| Connection/DNS timeout codes | Check actual endpoint, paused-project/network/TLS state and region placement                                       |

## Controlled read-only tools

`env:check`, `db:check`, `workspace:diagnose` and `dashboard:diagnose` contact the configured project. Review the target before running them; they were not run externally during cleanup. Never assume the ignored local URI is production. `dashboard:diagnose -- --compare-pipelining` deliberately compares the older workload; it is not a production repair.

`db:check` currently assumes every table has a browser SELECT policy. Private Storage reservations/entitlements intentionally have none. Treat those potential false positives as a diagnostic-review issue, not a reason to expose private tables. Its current checks also do not fully validate new quota/trial helpers.

Runtime `database-config.ts` retains verified TLS, prepared statements disabled, maximum three connections and `max_pipeline: 1` for Supabase transaction-pooler port 6543. Historical reproduction motivated that setting; it does not establish today's deployed pooler version or fix every timeout. Migration tooling uses direct/session mode, not port 6543. Per-view loaders reduce unrelated reads; Overview still needs some builder data.

The reported production modules-stage `42P01` is a separate unresolved schema/deployment mismatch. Follow the [reviewed dependency workflow](SERVQOO_PROJECT_GUIDE.md#18-database-migration-workflow); the current migrate command applies all pending changes, not just 0005/0006. Do not reset data, clear the journal, delete users, remove tenant checks, increase global timeouts blindly or retry writes with a new request ID when commit status is uncertain.
