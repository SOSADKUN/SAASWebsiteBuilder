import { describe, expect, it } from "vitest";
import {
  databaseOptions,
  getDatabaseUrl,
  safeDatabaseError,
} from "../src/lib/database-config";
import { getSupabaseConfiguration } from "../src/lib/supabase-config";
import {
  getApplicationOrigin,
  safeAuthDestination,
} from "../src/lib/auth-redirect";

describe("deployment configuration", () => {
  const url = "https://example.supabase.co";
  it("prefers publishable keys and supports legacy anon keys", () => {
    expect(
      getSupabaseConfiguration({
        NEXT_PUBLIC_SUPABASE_URL: url,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy",
      }).key,
    ).toBe("public");
    expect(
      getSupabaseConfiguration({
        NEXT_PUBLIC_SUPABASE_URL: url,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy",
      }).key,
    ).toBe("legacy");
  });
  it("rejects privileged keys without exposing their values", () => {
    for (const key of [
      "sb_secret_example",
      `x.${btoa(JSON.stringify({ role: "service_role" }))}.x`,
    ]) {
      expect(() =>
        getSupabaseConfiguration({
          NEXT_PUBLIC_SUPABASE_URL: url,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        }),
      ).toThrow("never a secret/service-role key");
    }
  });
  it("separates transaction runtime and session migration connections", () => {
    const env = {
      DATABASE_URL: "postgres://user:password@host:6543/postgres",
      MIGRATION_DATABASE_URL: "postgres://user:password@host:5432/postgres",
    };
    expect(getDatabaseUrl(env)).toBe(env.DATABASE_URL);
    expect(getDatabaseUrl(env, true)).toBe(env.MIGRATION_DATABASE_URL);
    expect(() =>
      getDatabaseUrl({ DATABASE_URL: env.DATABASE_URL }, true),
    ).toThrow("do not use transaction-pooler");
  });
  it("disables prepared statements and verifies Supabase TLS", () => {
    const options = databaseOptions(
      "postgres://user:password@aws-0.example.pooler.supabase.com:6543/postgres",
    );
    expect(options.prepare).toBe(false);
    expect(options.max_pipeline).toBe(1);
    expect(options.query_timeout).toBe(15);
    expect(options.queue_timeout).toBe(10);
    expect(options.cancel_timeout).toBe(5);
    expect(options.ssl).toMatchObject({ rejectUnauthorized: true });
    expect(safeDatabaseError(new Error("postgres://secret"))).not.toContain(
      "secret",
    );
  });
  it("limits in-flight queries per Supabase transaction-pooler connection without serializing the entire pool", () => {
    for (const migration of [false, true]) {
      const options = databaseOptions(
        "postgres://user:password@aws-0.example.pooler.supabase.com:6543/postgres",
        migration,
      );
      expect(options.max_pipeline).toBe(1);
      expect(options.max).toBe(migration ? 1 : 3);
      expect(options.prepare).toBe(false);
    }
    for (const connectionUrl of [
      "postgres://user:password@aws-0.example.pooler.supabase.com:5432/postgres",
      "postgres://user:password@db.example.supabase.co:5432/postgres",
      "postgres://user:password@localhost:5432/postgres",
    ])
      expect(databaseOptions(connectionUrl).max_pipeline).toBe(100);
  });
  it("requires a safe production origin and supports Vercel preview URLs", () => {
    expect(
      getApplicationOrigin({
        VERCEL_URL: "example.vercel.app",
        NODE_ENV: "production",
      }),
    ).toBe("https://example.vercel.app");
    for (const origin of [
      "http://localhost:3000",
      "https://example.com/path",
      "https://user:password@example.com",
    ])
      expect(() =>
        getApplicationOrigin({
          NEXT_PUBLIC_APP_URL: origin,
          NODE_ENV: "production",
        }),
      ).toThrow();
    expect(() => getApplicationOrigin({ NODE_ENV: "production" })).toThrow();
  });
  it("prevents confirmation redirects to external destinations", () => {
    for (const destination of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\nevil.example",
      null,
    ])
      expect(safeAuthDestination(destination)).toBe("/dashboard");
    expect(safeAuthDestination("/dashboard/designs")).toBe(
      "/dashboard/designs",
    );
  });
});
