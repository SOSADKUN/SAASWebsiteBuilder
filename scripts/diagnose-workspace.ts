import "./load-env";
import postgres from "postgres";
import { databaseOptions, getDatabaseUrl } from "../src/lib/database-config";
import { getSupabaseConfiguration } from "../src/lib/supabase-config";
import {
  workspaceErrorCode,
  workspaceCancellationReason,
} from "../src/lib/workspace-errors";
const ms = (start: number) => Math.round(performance.now() - start);
async function databaseCheck(label: string, url: string) {
  const client = postgres(url, databaseOptions(url, true));
  const start = performance.now();
  try {
    const result = await client.begin("read only", async (sql) => {
      const connectedMs = ms(start);
      const queryStart = performance.now();
      await sql`SELECT 1`;
      const roundTripMs = ms(queryStart);
      const [settings] =
        await sql`SELECT current_setting('statement_timeout') AS statement_timeout, current_setting('lock_timeout') AS lock_timeout`;
      const membershipStart = performance.now();
      // Exercise an indexed membership lookup without reading any customer's
      // membership, email or business. Results are intentionally discarded.
      await sql`SELECT 1 FROM public.merchant_users WHERE user_id='00000000-0000-4000-8000-000000000000'::uuid LIMIT 1`;
      const membershipReadMs = ms(membershipStart);
      const schema =
        await sql`SELECT to_regclass('public.merchant_subscriptions') IS NOT NULL AND to_regclass('public.merchant_trial_claims') IS NOT NULL AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='merchants' AND column_name='trial_ends_at') AS ready`;
      const locks =
        await sql`SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND pid<>pg_backend_pid()`;
      return {
        connectedMs,
        roundTripMs,
        statementTimeout: settings.statement_timeout,
        lockTimeout: settings.lock_timeout,
        membershipReadMs,
        schemaReady: schema[0].ready,
        lockWaiters: locks[0].waiting,
      };
    });
    console.log(
      JSON.stringify({ check: label, ...result, totalMs: ms(start) }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        check: label,
        errorCode: workspaceErrorCode(error),
        cancellationReason: workspaceCancellationReason(error),
        totalMs: ms(start),
      }),
    );
    process.exitCode = 1;
  } finally {
    await client.end({ timeout: 5 });
  }
}
async function main() {
  console.log(
    "Read-only diagnostics from this machine; these are not Vercel function timings. No account, email, business data or credentials are printed.",
  );
  await databaseCheck("runtime_database", getDatabaseUrl());
  if (process.env.MIGRATION_DATABASE_URL)
    await databaseCheck("migration_database", getDatabaseUrl(undefined, true));
  const start = performance.now();
  try {
    const config = getSupabaseConfiguration();
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.key },
      signal: AbortSignal.timeout(10000),
    });
    console.log(
      JSON.stringify({
        check: "auth_settings",
        status: response.status,
        totalMs: ms(start),
      }),
    );
    if (!response.ok) process.exitCode = 1;
  } catch {
    console.log(
      JSON.stringify({
        check: "auth_settings",
        error: "unavailable",
        totalMs: ms(start),
      }),
    );
    process.exitCode = 1;
  }
}
main().catch(() => {
  console.error(
    "Diagnostics could not start. Run env:check to validate configuration without exposing values.",
  );
  process.exitCode = 1;
});
