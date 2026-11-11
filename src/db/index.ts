import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
const globalDb = globalThis as unknown as {
  bloomDatabase?: ReturnType<typeof connect>;
};
function connect() {
  return drizzle(
    postgres(process.env.DATABASE_URL!, { prepare: false, max: 5 }),
    { schema },
  );
}
export function db() {
  if (!process.env.DATABASE_URL)
    throw new Error("Configure DATABASE_URL to use your database");
  globalDb.bloomDatabase ??= connect();
  return globalDb.bloomDatabase;
}
