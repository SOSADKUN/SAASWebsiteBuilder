import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile, readdir } from "node:fs/promises";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  db: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({
  authorize: mocks.authorize,
  user: vi.fn(),
  admin: vi.fn(),
  supabase: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: (error: { digest?: string }) => {
    if (error.digest?.startsWith("NEXT_REDIRECT;")) throw error;
  },
}));
import * as schema from "../src/db/schema";
import { saveProduct, saveMenuProduct } from "../src/server/actions";
let database: PGlite;
const merchantId = "11111111-1111-4111-8111-111111111111";
const otherMerchantId = "22222222-2222-4222-8222-222222222222";
const categoryId = "33333333-3333-4333-8333-333333333333";
const otherCategoryId = "44444444-4444-4444-8444-444444444444";
const expiredMerchantId = "55555555-5555-4555-8555-555555555555";
const product = {
  name: "Test coffee",
  description: "",
  price: 1250,
  image: "",
  categoryId,
  available: true,
  position: 0,
};
beforeAll(async () => {
  database = new PGlite();
  await database.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;",
  );
  for (const file of (await readdir("drizzle"))
    .filter((file) => file.endsWith(".sql"))
    .sort())
    await database.exec(await readFile(`drizzle/${file}`, "utf8"));
  await database.query(
    "INSERT INTO merchants(id,name,slug) VALUES ($1,'Test cafe','product-test'),($2,'Other cafe','other-product-test')",
    [merchantId, otherMerchantId],
  );
  await database.query(
    "INSERT INTO menu_categories(id,merchant_id,name) VALUES ($1,$2,'Coffee'),($3,$4,'Other')",
    [categoryId, merchantId, otherCategoryId, otherMerchantId],
  );
  await database.query(
    "INSERT INTO merchants(id,name,slug,trial_started_at,trial_ends_at) VALUES ($1,'Expired cafe','expired-product-test','2000-01-01','2000-01-15')",
    [expiredMerchantId],
  );
}, 60000);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.mockReturnValue(drizzle(database, { schema }));
  mocks.authorize.mockResolvedValue({ id: "test-owner" });
  mocks.revalidatePath.mockImplementation(() => {});
});
afterAll(async () => {
  await database?.close();
});
describe("product writes against migrated PostgreSQL", () => {
  it("creates a product without an image and updates it without changing its creation timestamp", async () => {
    await expect(saveProduct(merchantId, product)).resolves.toBeUndefined();
    const before = await database.query<{ id: string; created_at: Date }>(
      "SELECT id,created_at FROM menu_products WHERE merchant_id=$1",
      [merchantId],
    );
    expect(before.rows).toHaveLength(1);
    await saveProduct(merchantId, {
      ...product,
      id: before.rows[0].id,
      price: 1500,
      available: false,
    });
    const after = await database.query(
      "SELECT name,price,available,created_at FROM menu_products WHERE id=$1",
      [before.rows[0].id],
    );
    expect(after.rows[0]).toMatchObject({
      name: product.name,
      price: 1500,
      available: false,
      created_at: before.rows[0].created_at,
    });
    expect(mocks.authorize).toHaveBeenCalledWith(merchantId, "menu:manage");
  });
  it("returns a successful result for the Add Product form", async () => {
    const result = await saveMenuProduct(merchantId, {
      ...product,
      name: "New form coffee",
    });
    expect(result).toEqual({ ok: true });
    expect(
      (
        await database.query(
          "SELECT name FROM menu_products WHERE name='New form coffee'",
        )
      ).rows,
    ).toHaveLength(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
  it("returns a readable category error without inserting another tenant's category", async () => {
    const result = await saveMenuProduct(merchantId, {
      ...product,
      categoryId: otherCategoryId,
      name: "Invalid category coffee",
    });
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("category from this business"),
      reference: expect.any(String),
    });
    expect(
      (
        await database.query(
          "SELECT id FROM menu_products WHERE name='Invalid category coffee'",
        )
      ).rows,
    ).toHaveLength(0);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
  it("validates fields and returns safe feedback before writing", async () => {
    const result = await saveMenuProduct(merchantId, {
      ...product,
      image: "javascript:private-value",
      name: "Invalid image coffee",
    });
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("image URL"),
    });
    expect(JSON.stringify(result)).not.toContain("private-value");
    expect(
      (
        await database.query(
          "SELECT id FROM menu_products WHERE name='Invalid image coffee'",
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("preserves membership and menu permission checks before reading or writing", async () => {
    mocks.authorize.mockRejectedValue(
      new Error("Workspace permission required"),
    );
    expect(await saveMenuProduct(merchantId, product)).toMatchObject({
      ok: false,
      error: expect.stringContaining("permission"),
    });
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("keeps subscription enforcement and explains an expired trial", async () => {
    expect(await saveMenuProduct(expiredMerchantId, product)).toMatchObject({
      ok: false,
      error: expect.stringContaining("trial has ended"),
    });
    expect(
      (
        await database.query(
          "SELECT id FROM menu_products WHERE merchant_id=$1",
          [expiredMerchantId],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("does not update another merchant's product", async () => {
    const inserted = await database.query<{ id: string }>(
      "INSERT INTO menu_products(merchant_id,category_id,name,description,price) VALUES ($1,$2,'Other private coffee','',1000) RETURNING id",
      [otherMerchantId, otherCategoryId],
    );
    expect(
      await saveMenuProduct(merchantId, {
        ...product,
        id: inserted.rows[0].id,
      }),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("no longer available"),
    });
    expect(
      (
        await database.query("SELECT name FROM menu_products WHERE id=$1", [
          inserted.rows[0].id,
        ])
      ).rows[0],
    ).toMatchObject({ name: "Other private coffee" });
  });
  it("returns a reference correlated with safe database failure logs", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      mocks.db.mockImplementation(() => {
        throw {
          cause: {
            code: "QUERY_TIMEOUT",
            message: "private SQL and credentials",
          },
        };
      });
      const result = await saveMenuProduct(merchantId, product);
      expect(result).toMatchObject({
        ok: false,
        error: expect.stringContaining("did not respond in time"),
      });
      if (result.ok) throw new Error("Expected failure");
      expect(result.reference).toMatch(/^[a-f0-9-]{36}$/);
      const entries = log.mock.calls.map(([line]) => JSON.parse(String(line)));
      expect(
        entries.some(
          (entry) =>
            entry.reference === result.reference &&
            entry.outcome === "failed" &&
            entry.errorCode === "QUERY_TIMEOUT",
        ),
      ).toBe(true);
      expect(JSON.stringify({ result, entries })).not.toContain(
        "private SQL and credentials",
      );
    } finally {
      log.mockRestore();
    }
  });
  it("preserves the sign-in redirect if a session expires during submission", async () => {
    const redirect = { digest: "NEXT_REDIRECT;replace;/login;307;" };
    mocks.authorize.mockRejectedValue(redirect);
    await expect(saveMenuProduct(merchantId, product)).rejects.toBe(redirect);
  });
});
