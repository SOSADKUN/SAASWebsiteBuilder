# Dashboard database timeout: 13 November 2026

The production trace `bfdffcf3-83da-4525-b845-87bc783bed45` completed authentication and membership. Of eight parallel Dashboard reads, only business, media and catalog completed before other stages reached `QUERY_TIMEOUT` at 15 seconds.

## Confirmed cause and fix

Postgres.js defaults to pipelining multiple queries on each connection. The configured Supabase transaction pooler on port 6543 dropped replies for this workload. A SELECT-only reproduction with a synthetic merchant/user and the application's Drizzle schema reproduced the exact pattern: business, media and catalog completed; pages, products, categories, entitlements and prices timed out. The synthetic tenant removes customer data size from the reproduction.

The same workload with `max_pipeline: 1` completed all eight reads on both cold and warm passes. The driver documents this Supavisor compatibility issue and the setting in its [connection-pooler guidance](https://github.com/porsager/postgres#connection-poolers). The deployed Supavisor version was not inspected.

`src/lib/database-config.ts` now sets `max_pipeline: 1` only for Supabase pooler hosts on port 6543. The runtime pool still supports three connections, so independent queries can run concurrently on separate connections. Prepared statements remain disabled, TLS stays verified, and query/queue/cancellation deadlines remain enforced. Direct and session-pooler connections retain their default pipeline size.

No authentication, membership, subscription or tenant predicate was removed. No migration, database write or data reset is required.

## Reproduce and verify

Run from the repository root with the existing git-ignored environment configuration:

```powershell
# Fixed configuration: two Dashboard read groups plus read-only transactions.
npm.cmd run dashboard:diagnose

# Optional comparison: deliberately tries the old pipeline size first,
# then compares with one in-flight query per connection.
npm.cmd run dashboard:diagnose -- --compare-pipelining
```

The probe issues only SELECT queries and read-only transactions. It discards all results and logs only static stage names, generated references, timings and allowlisted errors. It does not create or log an account, merchant, membership or customer content. It runs from the invoking machine; it does not measure Vercel function latency.

The comparison exits unsuccessfully if the non-pipelined run fails. A failure in the deliberately pipelined baseline is reported separately. Configuration regression tests cover transaction, session and direct connection settings. Existing PostgreSQL integration tests cover new-account onboarding and complete merchant Dashboard loading.

## Production rollout

Deploy the code through the existing Vercel workflow. A new deployment constructs a new database client with the corrected options; environment values do not need to change for this fix. Validate the existing merchant login and confirm `dashboard_ready` in the production logs. A new user without membership must still reach `onboarding_ready`.

The missing pages/prices outcomes in the supplied trace do not establish that those queries never settled: `Promise.all` rejects at the first failure and allows the error page to finish the request before other query diagnostics arrive. The CLI probe uses `Promise.allSettled` to keep the process alive until every query has an outcome. Production does not wait for every failed query before showing an error.
