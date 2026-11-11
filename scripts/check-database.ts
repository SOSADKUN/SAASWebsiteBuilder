import "./load-env";
import postgres from "postgres";
import { getTableName, getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "../src/db/schema";
import {
  getDatabaseUrl,
  databaseOptions,
  safeDatabaseError,
} from "../src/lib/database-config";
import { definitions } from "../src/lib/models";
import { getSupabaseConfiguration } from "../src/lib/supabase-config";
import { readMigrationFiles } from "drizzle-orm/migrator";
import {
  matchesForeignKey,
  type DatabaseForeignKey,
} from "./foreign-key-check";
async function main() {
  const connectionUrl = process.env.MIGRATION_DATABASE_URL || getDatabaseUrl();
  const client = postgres(connectionUrl, databaseOptions(connectionUrl, true));
  try {
    const issues: string[] = [];
    const result = await client.begin("read only", async (sql) => {
      const tables = await sql<
        { table_name: string; rls: boolean }[]
      >`SELECT c.relname AS table_name,c.relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`;
      const columns = await sql<
        { table_name: string; column_name: string }[]
      >`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'`;
      const constraints = await sql<DatabaseForeignKey[]>`
        SELECT c.conname AS name, source.relname AS source_table,
          target.relname AS target_table, target_ns.nspname AS target_schema,
          ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum,position)
            JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.position) AS source_columns,
          ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum,position)
            JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.position) AS target_columns,
          c.convalidated AS validated, c.confdeltype AS delete_action, c.confupdtype AS update_action
        FROM pg_constraint c
        JOIN pg_class source ON source.oid=c.conrelid
        JOIN pg_namespace source_ns ON source_ns.oid=source.relnamespace
        JOIN pg_class target ON target.oid=c.confrelid
        JOIN pg_namespace target_ns ON target_ns.oid=target.relnamespace
        WHERE source_ns.nspname='public' AND c.contype='f'
      `;
      const indexes = await sql<
        { indexname: string }[]
      >`SELECT indexname FROM pg_indexes WHERE schemaname='public'`;
      const policies = await sql<
        {
          schemaname: string;
          tablename: string;
          policyname: string;
          cmd: string;
        }[]
      >`SELECT schemaname,tablename,policyname,cmd FROM pg_policies WHERE schemaname IN ('public','storage')`;
      for (const table of Object.values(schema)) {
        const name = getTableName(table);
        const live = tables.find((t) => t.table_name === name);
        if (!live) {
          issues.push(`Missing table: ${name}`);
          continue;
        }
        if (!live.rls) issues.push(`RLS disabled: ${name}`);
        for (const column of Object.values(getTableColumns(table)))
          if (
            !columns.some(
              (c) => c.table_name === name && c.column_name === column.name,
            )
          )
            issues.push(`Missing column: ${name}.${column.name}`);
        const config = getTableConfig(table);
        for (const fk of config.foreignKeys) {
          const reference = fk.reference();
          if (
            !constraints.some((c) =>
              matchesForeignKey(c, {
                sourceTable: name,
                sourceColumns: reference.columns.map((column) => column.name),
                targetSchema:
                  getTableConfig(reference.foreignTable).schema ?? "public",
                targetTable: getTableName(reference.foreignTable),
                targetColumns: reference.foreignColumns.map(
                  (column) => column.name,
                ),
                onDelete: fk.onDelete ?? "no action",
                onUpdate: fk.onUpdate ?? "no action",
              }),
            )
          )
            issues.push(`Missing foreign key: ${fk.getName()}`);
        }
        for (const index of config.indexes)
          if (!indexes.some((i) => i.indexname === index.config.name))
            issues.push(`Missing index: ${index.config.name}`);
      }
      const ledger =
        await sql`SELECT to_regclass('drizzle.__drizzle_migrations') AS relation`;
      let appliedMigrations = 0;
      if (ledger[0]?.relation) {
        const rows = await sql<
          { hash: string }[]
        >`SELECT hash FROM drizzle.__drizzle_migrations`;
        appliedMigrations = rows.length;
        for (const migration of readMigrationFiles({
          migrationsFolder: "drizzle",
        }))
          if (!rows.some((r) => r.hash === migration.hash))
            issues.push(
              "A committed migration hash is absent from the migration ledger",
            );
      } else issues.push("Drizzle migration ledger is absent");
      let registeredVersions = 0;
      if (tables.some((t) => t.table_name === "component_versions")) {
        const versions = await sql<
          { component_key: string; version: number }[]
        >`SELECT component_key,version FROM component_versions`;
        registeredVersions = versions.length;
        for (const d of definitions)
          for (const version of d.versions)
            if (
              !versions.some(
                (v) => v.component_key === d.key && v.version === version,
              )
            )
              issues.push(`Unregistered component: ${d.key}@${version}`);
      }
      const bucket = await sql<
        {
          public: boolean;
          file_size_limit: number | null;
          allowed_mime_types: string[] | null;
        }[]
      >`SELECT public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='merchant-media'`;
      if (!bucket.length)
        issues.push("merchant-media storage bucket is absent");
      else if (!bucket[0].public)
        issues.push(
          "merchant-media bucket must be public for existing public image URLs",
        );
      for (const name of [
        "merchant_upload",
        "merchant_read_upload",
        "merchant_remove_upload",
      ])
        if (
          !policies.some(
            (p) =>
              p.schemaname === "storage" &&
              p.tablename === "objects" &&
              p.policyname === name,
          )
        )
          issues.push(`Missing storage policy: ${name}`);
      for (const table of Object.values(schema)) {
        const name = getTableName(table);
        if (
          tables.some((t) => t.table_name === name) &&
          !policies.some(
            (p) =>
              p.schemaname === "public" &&
              p.tablename === name &&
              p.cmd === "SELECT",
          )
        )
          issues.push(`Missing read policy: ${name}`);
      }
      const membershipFunction =
        await sql`SELECT to_regprocedure('public.is_merchant_member(uuid)') AS function`;
      if (!membershipFunction[0]?.function)
        issues.push("Tenant membership function is absent");
      const subscriptionFunction =
        await sql`SELECT to_regprocedure('public.merchant_has_subscription(uuid)') AS function`;
      if (!subscriptionFunction[0]?.function)
        issues.push("Subscription storage guard function is absent");
      const subscriptionTriggers = await sql<
        { name: string }[]
      >`SELECT tgname AS name FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (to_regclass('public.merchants'),to_regclass('public.merchant_subscriptions'),to_regclass('public.subscription_events'),to_regclass('public.merchant_trial_claims'))`;
      for (const name of [
        "initialize_merchant_trial",
        "preserve_merchant_trial",
        "preserve_subscription_events",
        "preserve_trial_claims",
        "audit_subscription_change",
      ])
        if (!subscriptionTriggers.some((trigger) => trigger.name === name))
          issues.push(`Missing subscription trigger: ${name}`);
      return {
        connection: "successful",
        expectedTables: Object.keys(schema).length,
        applicationTablesFound: tables.filter((t) =>
          Object.values(schema).some((s) => getTableName(s) === t.table_name),
        ).length,
        appliedMigrations,
        registeredVersions,
        storageBucketConfigured: Boolean(bucket.length),
        issues,
      };
    });
    console.log(JSON.stringify(result, null, 2));
    if (issues.length) process.exitCode = 1;
  } finally {
    await client.end({ timeout: 5 });
  }
  try {
    const configuration = getSupabaseConfiguration();
    const response = await fetch(`${configuration.url}/auth/v1/settings`, {
      headers: { apikey: configuration.key },
      signal: AbortSignal.timeout(10000),
    });
    console.log(`Supabase Auth settings endpoint: HTTP ${response.status}`);
    if (!response.ok) process.exitCode = 1;
  } catch {
    console.log("Supabase Auth endpoint could not be verified");
    process.exitCode = 1;
  }
}
main().catch((error) => {
  console.error(safeDatabaseError(error));
  process.exitCode = 1;
});
