import "./load-env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readFile } from "node:fs/promises";
import { registerCatalog } from "./catalog";
import {
  getDatabaseUrl,
  databaseOptions,
  safeDatabaseError,
} from "../src/lib/database-config";
async function main() {
  const connectionUrl = getDatabaseUrl(undefined, true);
  const client = postgres(connectionUrl, databaseOptions(connectionUrl, true));
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    const policies = await readFile("supabase/policies.sql", "utf8");
    await client.begin((sql) => sql.unsafe(policies));
    await registerCatalog(drizzle(client));
    console.log("Schema and policies applied.");
  } finally {
    await client.end();
  }
}
main().catch((e) => {
  console.error(safeDatabaseError(e));
  process.exitCode = 1;
});
