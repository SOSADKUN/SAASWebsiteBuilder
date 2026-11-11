import "./load-env";
import { getSupabaseConfiguration } from "../src/lib/supabase-config";
import { getDatabaseUrl } from "../src/lib/database-config";
import { getApplicationOrigin } from "../src/lib/auth-redirect";
let failed = false;
for (const name of [
  "DATABASE_URL",
  "MIGRATION_DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
])
  console.log(
    `${name}: ${process.env[name] ? "configured" : "not configured"}`,
  );
for (const [label, validate] of [
  ["Supabase public configuration", () => getSupabaseConfiguration()],
  ["Runtime database configuration", () => getDatabaseUrl()],
  [
    "Production application origin",
    () => getApplicationOrigin({ ...process.env, NODE_ENV: "production" }),
  ],
] as const) {
  try {
    validate();
    console.log(`${label}: valid`);
  } catch (error) {
    failed = true;
    console.error(
      error instanceof Error ? error.message : "Configuration check failed",
    );
  }
}
try {
  getDatabaseUrl(undefined, true);
  console.log("Migration connection: configured");
} catch {
  console.log(
    "Migration connection: needs a direct/session MIGRATION_DATABASE_URL if runtime uses port 6543",
  );
}
if (failed) process.exitCode = 1;
