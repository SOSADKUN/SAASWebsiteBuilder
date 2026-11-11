import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { getDatabaseUrl, databaseOptions } from "@/lib/database-config";
const globalDb = globalThis as unknown as {
  bloomDatabase?: ReturnType<typeof connect>;
};
function connect() {
  const connectionUrl = getDatabaseUrl();
  return drizzle(postgres(connectionUrl, databaseOptions(connectionUrl)), {
    schema,
  });
}
export function db() {
  if (!process.env.DATABASE_URL)
    throw new Error("Configure DATABASE_URL to use your database");
  globalDb.bloomDatabase ??= connect();
  return globalDb.bloomDatabase;
}
