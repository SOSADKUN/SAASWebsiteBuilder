import "./load-env";
import postgres from "postgres";
import {
  databaseOptions,
  getDatabaseUrl,
  safeDatabaseError,
} from "../src/lib/database-config";

async function main() {
  const url = process.env.MIGRATION_DATABASE_URL || getDatabaseUrl();
  const client = postgres(url, databaseOptions(url, true));
  try {
    const result = await client.begin("read only", async (sql) => ({
      identifierLimit: await sql`SHOW max_identifier_length`,
      constraints:
        await sql`SELECT c.conname, c.convalidated, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c WHERE c.conrelid IN ('public.merchant_entitlements'::regclass, 'public.component_definitions'::regclass) ORDER BY c.conrelid,c.conname`,
      columns:
        await sql`SELECT table_name,column_name,data_type,udt_name,is_nullable FROM information_schema.columns WHERE table_schema='public' AND ((table_name='merchant_entitlements' AND column_name='component_key') OR (table_name='component_definitions' AND column_name='key'))`,
      orphanCounts:
        await sql`SELECT count(*)::int AS orphan_count FROM public.merchant_entitlements e WHERE e.component_key IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.component_definitions d WHERE d.key=e.component_key)`,
    }));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.end({ timeout: 5 });
  }
}
main().catch((error) => {
  console.error(safeDatabaseError(error));
  process.exitCode = 1;
});
