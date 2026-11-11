# Investigate slow workspace creation

The spinner cannot distinguish Auth latency, a database connection wait, a locked statement or a slow dashboard render. Use the stage logs instead of repeatedly submitting or deleting users.

## Current read-only observations

The configured database now has 18 tables, 3 migrations, 33 component versions, the media bucket and `"issues": []`. The missing migration is no longer the explanation against this database. Vercel's saved environment values were not inspected; confirm Production targets this same project.

Diagnostics from this development machine measured about 2,451 ms for a fresh runtime database connection, 305 ms for one SQL round trip, and 1,038 ms for the public Auth settings endpoint. No sessions were waiting on database locks during that snapshot. These are **not Vercel function timings**. The public Auth settings check does not validate a user's session.

```powershell
npm.cmd run db:check
npm.cmd run workspace:diagnose
```

The diagnostics inspect runtime and optional migration connections separately. They print only timings, schema readiness, lock-wait counts and HTTP status. No writes, emails, credentials, hostnames, merchant data or SQL text are involved.

## Investigate on Vercel

1. Deploy the updated code. New instrumentation cannot appear in an older deployment's logs.
2. Open the Vercel project's **Logs**, select Production and the relevant request time/path (`/dashboard`). Search for `workspace.create`.
3. Submit once. The button disables while pending and acknowledges delays after ten seconds. Do not submit again from another tab.
4. Compare `started` and `completed` events sharing the same server-generated `reference`. `durationMs` measures that stage; `totalMs` measures the request so far. Failures include only an allowlisted `errorCode`.
5. An inline error's Support reference matches these logs. Share the reference, stage, outcome, duration and code, not full requests/cookies or confirmation URLs.

| Last stage                                                                              | Investigate                                                                                        |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| No `workspace.create` entry                                                             | Correct deployment, browser Network request, or Proxy/network delays before the action starts.     |
| `authentication`                                                                        | Supabase session validation, connectivity or retries.                                              |
| `database_transaction`, before `transaction_limits` starts                              | Connection/pool acquisition or transaction BEGIN.                                                  |
| `transaction_limits`                                                                    | Transaction-local timeout setup.                                                                   |
| `profile`, `merchant`, `trial_claim`, `membership`, `website`, `homepage`, `categories` | That SQL operation or its trigger. The merchant insert initializes trial/subscription records too. |
| `categories` completed but transaction not completed                                    | Commit or its network response; do not assume rollback if the connection failed around commit.     |
| `ready_to_redirect`                                                                     | Creation committed. Look for `dashboard.load` next.                                                |
| `dashboard.load` completed                                                              | Browser network/navigation or client rendering.                                                    |

In browser Developer Tools → Network, enable Preserve log, submit once, and inspect the action request's Timing. A separate wait after redirect can be dashboard loading. Next.js may stream navigation inside HTTP 200, so HTTP status alone does not prove success. Do not share request bodies, cookies, tokens or full confirmation URLs.

## Error codes

| Code                                                        | Meaning                                                                                                                    |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `42P01`, `42703`                                            | Missing table/column in the deployment's actual database. Check Production project and migration state.                    |
| `23505`                                                     | Website address already used.                                                                                              |
| `TRIAL_CLAIMED`                                             | This account already created its trial business; open the existing workspace.                                              |
| `55P03`                                                     | Lock wait timed out. Inspect Supabase Database Connections while stuck.                                                    |
| `57014`                                                     | Statement canceled, including statement-timeout cases. Check stage and database logs.                                      |
| `CONNECT_TIMEOUT`, `ECONNREFUSED`, `ENOTFOUND`, `ETIMEDOUT` | Connection/network problem.                                                                                                |
| `42501`                                                     | Database permissions need attention.                                                                                       |
| `UNKNOWN`                                                   | Arbitrary provider details are deliberately excluded; correlate the reference with restricted administrator/platform logs. |

## Changes that reduce delay

The five default categories now use one insert instead of five, removing four round trips. Dashboard capability checks reuse the already validated user/membership instead of repeating Auth and the same membership query. Server-side tenant and role checks remain enforced.

Workspace SQL uses transaction-local statement (15 seconds), lock (5 seconds) and idle-in-transaction (20 seconds) timeouts. They reset with the transaction; they do not change global database settings or bound Auth, pool acquisition or dashboard rendering. There is no client timeout that pretends a possibly committed write was canceled, and no automatic write retry.

Compare Vercel's function region with the Supabase database region. Keep functions near the data source where appropriate; changing regions is a separate deployment decision. Inspect connection usage before changing pool sizes.

References: [Vercel Runtime Logs](https://vercel.com/docs/logs/runtime), [function regions](https://vercel.com/docs/functions/configuring-functions/region), [Supabase connection management](https://supabase.com/docs/guides/database/connection-management).

## Layout

The initial form fits standard desktop and phone viewports without scrolling. Short-screen spacing adapts. Keyboard, browser zoom and long errors can scroll naturally so nothing is clipped. Values remain preserved after server errors.
