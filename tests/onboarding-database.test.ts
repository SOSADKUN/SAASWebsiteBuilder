import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile, readdir } from "node:fs/promises";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ db: vi.fn(), user: vi.fn() }));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({
  user: mocks.user,
  authorize: vi.fn(),
  supabase: vi.fn(),
  admin: vi.fn(),
}));
vi.mock("@/lib/subscription-service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/subscription-service")>()),
  requireSubscription: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { createBusiness } from "../src/server/actions";
import { dashboardData } from "../src/server/queries";
import * as schema from "../src/db/schema";
let database: PGlite;
beforeAll(async () => {
  database = new PGlite();
  await database.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;",
  );
  for (const file of (await readdir("drizzle"))
    .filter((file) => file.endsWith(".sql"))
    .sort())
    await database.exec(await readFile(`drizzle/${file}`, "utf8"));
  mocks.db.mockReturnValue(drizzle(database, { schema }));
  mocks.user.mockResolvedValue({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    email: "test@example.com",
  });
}, 60000);
afterAll(async () => {
  await database?.close();
});
function form(slug: string) {
  const data = new FormData();
  data.set("name", "My test cafe");
  data.set("slug", slug);
  return data;
}
describe("real onboarding transaction", () => {
  it("lets a newly registered account reach onboarding without a merchant", async () => {
    expect(await dashboardData()).toBeNull();
  });
  it("creates the complete starter workspace with database trial timestamps", async () => {
    await expect(createBusiness(form("first-cafe"))).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
    for (const table of [
      "merchants",
      "merchant_users",
      "merchant_trial_claims",
      "merchant_subscriptions",
      "subscription_events",
      "websites",
      "pages",
    ])
      expect(
        (await database.query(`SELECT * FROM ${table}`)).rows,
      ).toHaveLength(1);
    expect(
      (await database.query("SELECT * FROM menu_categories")).rows,
    ).toHaveLength(5);
    expect(
      (await database.query("SELECT published FROM pages")).rows[0],
    ).toMatchObject({ published: null });
    const dashboard = await dashboardData();
    expect(dashboard?.business.slug).toBe("first-cafe");
    expect(dashboard?.pages).toHaveLength(1);
    expect(dashboard?.categories).toHaveLength(0);
    const menu = await dashboardData("menu:view", undefined, "Menu Manager");
    expect(menu?.categories).toHaveLength(5);
    expect(menu?.pages).toHaveLength(0);
    expect(dashboard?.subscription.status).toBe("trialing");
  });
  it("rolls back an entire second workspace when the account trial is already claimed", async () => {
    await expect(createBusiness(form("second-cafe"))).rejects.toThrow(
      "already created a trial business",
    );
    expect((await database.query("SELECT * FROM merchants")).rows).toHaveLength(
      1,
    );
    expect(
      (await database.query("SELECT * FROM subscription_events")).rows,
    ).toHaveLength(1);
  });
  it("persists a selected salon type through real onboarding without enabling future flows", async () => {
    mocks.user.mockResolvedValue({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      email: "salon@example.test",
    });
    const input = form("new-salon");
    input.set("businessType", "hair_salon");
    await expect(createBusiness(input)).rejects.toThrow("REDIRECT:/dashboard");
    const dashboard = await dashboardData();
    expect(dashboard?.businessType).toBe("hair_salon");
    expect(dashboard?.modules.find((m) => m.key === "pos")?.enabled).toBe(
      false,
    );
    expect(
      dashboard?.modules.find((m) => m.key === "appointments"),
    ).toBeUndefined();
    expect(
      dashboard?.pages[0].draft.find((s) => s.key === "ordering-cta")?.visible,
    ).toBe(false);
  });
  it("rejects an invalid business type before creating any workspace", async () => {
    const before = (
      await database.query("SELECT count(*)::int AS count FROM merchants")
    ).rows[0];
    const input = form("invalid-type");
    input.set("businessType", "super_admin");
    await expect(createBusiness(input)).rejects.toThrow();
    expect(
      (await database.query("SELECT count(*)::int AS count FROM merchants"))
        .rows[0],
    ).toEqual(before);
  });
});
