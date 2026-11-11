import { config } from "dotenv";
config({ path: ".env.local" });
config();
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readFile } from "node:fs/promises";
import { registerCatalog } from "./catalog";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    await client.unsafe(await readFile("supabase/policies.sql", "utf8"));
    await registerCatalog(drizzle(client));
    console.log("Schema and policies applied.");
  } finally {
    await client.end();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Migration failed");
  process.exitCode = 1;
});
