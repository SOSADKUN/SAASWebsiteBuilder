import { SUPABASE_DATABASE_CA } from "./supabase-ca";
type DatabaseEnvironment = {
  DATABASE_URL?: string;
  MIGRATION_DATABASE_URL?: string;
};
export function getDatabaseUrl(
  env: DatabaseEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    MIGRATION_DATABASE_URL: process.env.MIGRATION_DATABASE_URL,
  },
  migration = false,
) {
  const value = migration
    ? env.MIGRATION_DATABASE_URL || env.DATABASE_URL
    : env.DATABASE_URL;
  if (!value)
    throw new Error(
      migration
        ? "Set MIGRATION_DATABASE_URL (or a session/direct DATABASE_URL) before running database tooling."
        : "DATABASE_URL is required.",
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The configured database URL is invalid.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname)
    throw new Error(
      "The configured database URL must be a PostgreSQL connection URI.",
    );
  if (migration && url.port === "6543")
    throw new Error(
      "Database tooling requires a direct or session-pooler connection. Set MIGRATION_DATABASE_URL; do not use transaction-pooler port 6543.",
    );
  return value;
}
export function databaseOptions(connectionUrl: string, migration = false) {
  const url = new URL(connectionUrl);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const supabase =
    url.hostname.endsWith(".pooler.supabase.com") ||
    /^db\.[a-z0-9]+\.supabase\.co$/.test(url.hostname);
  const supabaseTransactionPooler =
    url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543";
  return {
    prepare: false,
    max: migration ? 1 : 3,
    // Supavisor transaction pooling can drop replies when extended queries
    // overlap on one socket. Keep parallelism across the pool, but wait for a
    // query to finish before sending the next on that same connection.
    // https://github.com/porsager/postgres#connection-poolers
    max_pipeline: supabaseTransactionPooler ? 1 : 100,
    idle_timeout: 20,
    connect_timeout: 10,
    // Bound both pool starvation and stalled SQL at the driver, which cancels
    // timed-out queries instead of leaving work running behind a UI timer.
    queue_timeout: 10,
    query_timeout: 15,
    cancel_timeout: 5,
    ssl: local
      ? false
      : supabase
        ? { ca: SUPABASE_DATABASE_CA, rejectUnauthorized: true }
        : ("verify-full" as const),
  };
}
export function safeDatabaseError(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  return /^[A-Z0-9_]{3,30}$/.test(code)
    ? `Database operation failed (${code}). Check the connection, permissions and deployment instructions.`
    : "Database operation failed. Check the connection, permissions and deployment instructions.";
}
