import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile, readdir } from "node:fs/promises";
import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  getUser: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: vi.fn() }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/supabase-config", () => ({
  hasSupabaseConfiguration: () => true,
  getSupabaseConfiguration: () => ({
    url: "https://example.test",
    key: "public",
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("Login required");
  },
  unstable_rethrow: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import * as schema from "../src/db/schema";
import { authorize } from "../src/lib/auth";
import { configureModule, setBusinessType } from "../src/server/module-actions";
import { merchantModuleState } from "../src/server/module-service";
import { dashboardData } from "../src/server/queries";
import { initialLayout } from "../src/lib/models";
import {
  createPosOrder,
  operationsSnapshot,
} from "../src/server/order-service";
let database: PGlite;
let executedQueries: string[] = [];
const merchant = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const owner = "33333333-3333-4333-8333-333333333333";
const cashier = "44444444-4444-4444-8444-444444444444";
const kitchen = "55555555-5555-4555-8555-555555555555";
const editor = "66666666-6666-4666-8666-666666666666";
const legacy = "77777777-7777-4777-8777-777777777777";
const unknown = "88888888-8888-4888-8888-888888888888";
const category = "99999999-9999-4999-8999-999999999999";
const product = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const original = initialLayout("Existing cafe");
function login(id: string | null = owner) {
  mocks.getUser.mockResolvedValue({
    data: { user: id ? { id, email: "test@example.test" } : null },
    error: null,
  });
}
beforeAll(async () => {
  database = new PGlite();
  await database.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO authenticated; GRANT SELECT,INSERT,DELETE ON storage.objects TO authenticated;
    CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name,'/') $$;
    GRANT EXECUTE ON FUNCTION storage.foldername(text) TO authenticated;`);
  for (const file of (await readdir("drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (file.startsWith("0005")) {
      await database.query(
        "INSERT INTO user_profiles(id,name) VALUES($1,'Owner'),($2,'Existing editor')",
        [owner, legacy],
      );
      await database.query(
        "INSERT INTO merchants(id,name,slug) VALUES($1,'Existing cafe','existing')",
        [merchant],
      );
      await database.query(
        "INSERT INTO merchant_users(merchant_id,user_id,role) VALUES($1,$2,'owner'),($1,$3,'editor')",
        [merchant, owner, legacy],
      );
      await database.exec(
        "INSERT INTO component_definitions(key,name,category,premium) VALUES('header-centered','Header','header',true)",
      );
      await database.query(
        "INSERT INTO merchant_entitlements(merchant_id,component_key,source) VALUES($1,'header-centered','demo')",
        [merchant],
      );
      await database.query(
        "WITH w AS (INSERT INTO websites(merchant_id,title) VALUES($1,'Original website') RETURNING id) INSERT INTO pages(merchant_id,website_id,title,draft,published) SELECT $1,id,'Home',$2::jsonb,$2::jsonb FROM w",
        [merchant, JSON.stringify(original)],
      );
    }
    await database.exec(await readFile(`drizzle/${file}`, "utf8"));
  }
  await database.exec(await readFile("supabase/policies.sql", "utf8"));
  await database.query(
    "INSERT INTO merchants(id,name,slug,business_type) VALUES($1,'Salon','salon','hair_salon')",
    [other],
  );
  for (const [id, role] of [
    [cashier, "cashier"],
    [kitchen, "kitchen"],
    [editor, "editor"],
    [unknown, "unrecognized"],
  ]) {
    await database.query(
      "INSERT INTO user_profiles(id,name) VALUES($1,'Staff')",
      [id],
    );
    await database.query(
      "INSERT INTO merchant_users(merchant_id,user_id,role) VALUES($1,$2,$3)",
      [merchant, id, role],
    );
  }
  await database.query(
    "INSERT INTO menu_categories(id,merchant_id,name) VALUES($1,$2,'Coffee')",
    [category, merchant],
  );
  await database.query(
    "INSERT INTO menu_products(id,merchant_id,category_id,name,description,price) VALUES($1,$2,$3,'Coffee','Original product',1000)",
    [product, merchant, category],
  );
  mocks.db.mockReturnValue(
    drizzle(database, {
      schema,
      logger: {
        logQuery(query) {
          executedQueries.push(query);
        },
      },
    }),
  );
}, 60000);
beforeEach(async () => {
  executedQueries = [];
  login();
  await database.exec("RESET ROLE");
  await database.query(
    "UPDATE merchant_modules SET enabled=true WHERE merchant_id=$1",
    [merchant],
  );
  await database.query(
    "UPDATE business_module_entitlements SET expires_at=NULL WHERE merchant_id=$1",
    [merchant],
  );
});
afterAll(async () => {
  await database?.close();
});
async function browser<T>(id: string, run: () => Promise<T>) {
  await database.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
    id,
  ]);
  await database.exec("SET ROLE authenticated");
  try {
    return await run();
  } finally {
    await database.exec("RESET ROLE");
  }
}
describe("module migration and real authorization", () => {
  it("backfills cafe modules, preserves legacy editors, published layouts and design ownership", async () => {
    const result = await database.query(
      "SELECT business_type FROM merchants WHERE id=$1",
      [merchant],
    );
    expect(result.rows[0]).toMatchObject({ business_type: "cafe" });
    expect(
      (
        await database.query(
          "SELECT role FROM merchant_users WHERE user_id=$1",
          [legacy],
        )
      ).rows[0],
    ).toMatchObject({ role: "legacy_editor" });
    expect(
      (
        await database.query(
          "SELECT published FROM pages WHERE merchant_id=$1",
          [merchant],
        )
      ).rows[0],
    ).toMatchObject({ published: original });
    expect(
      (
        await database.query(
          "SELECT source FROM merchant_entitlements WHERE merchant_id=$1",
          [merchant],
        )
      ).rows[0],
    ).toMatchObject({ source: "demo" });
    expect(
      (await merchantModuleState(merchant)).filter((m) => m.enabled),
    ).toHaveLength(9);
    login(legacy);
    await expect(authorize(merchant, "pos:operate")).resolves.toMatchObject({
      id: legacy,
    });
  });
  it("starts a salon with shared modules only, without changing cafe settings", async () => {
    const salon = await merchantModuleState(other);
    expect(salon.find((m) => m.key === "website")?.enabled).toBe(true);
    expect(salon.find((m) => m.key === "pos")?.enabled).toBe(false);
    expect(salon.find((m) => m.key === "appointments")).toBeUndefined();
  });
  it("denies unauthenticated, foreign merchant and unknown role access", async () => {
    login(null);
    await expect(authorize(merchant, "pos:operate")).rejects.toThrow(
      "Login required",
    );
    login();
    await expect(authorize(other, "pos:operate")).rejects.toThrow(
      "Business access denied",
    );
    login(unknown);
    await expect(dashboardData()).rejects.toThrow(
      "Workspace permission required",
    );
  });
  it("enforces cashier/editor/kitchen restrictions through the real auth helper", async () => {
    login(cashier);
    await expect(
      dashboardData("workspace:view", undefined, "Website Editor"),
    ).rejects.toThrow("Workspace permission required");
    await expect(authorize(merchant, "pos:operate")).resolves.toBeTruthy();
    await expect(authorize(merchant, "menu:manage")).rejects.toThrow(
      "Workspace permission required",
    );
    await expect(authorize(merchant, "data:export")).rejects.toThrow(
      "Workspace permission required",
    );
    login(editor);
    await expect(authorize(merchant, "pos:operate")).rejects.toThrow(
      "Workspace permission required",
    );
    login(kitchen);
    await expect(authorize(merchant, "orders:manage")).resolves.toBeTruthy();
  });
  it("supports owner configuration without granting licenses or changing other tenants", async () => {
    expect(await configureModule(merchant, "pos", false)).toEqual({ ok: true });
    await expect(authorize(merchant, "pos:operate")).rejects.toThrow(
      "Business module",
    );
    await expect(
      dashboardData(undefined, undefined, "POS / Cashier"),
    ).rejects.toThrow("Business module");
    expect(
      (await merchantModuleState(other)).find((m) => m.key === "pos")?.enabled,
    ).toBe(false);
    expect(await configureModule(merchant, "pos", true)).toEqual({ ok: true });
    expect(
      (
        await database.query(
          "SELECT source FROM business_module_entitlements WHERE merchant_id=$1 AND module_key='pos'",
          [merchant],
        )
      ).rows[0],
    ).toMatchObject({ source: "legacy" });
  });
  it("rejects future, required, dependency-breaking and non-owner module changes", async () => {
    for (const key of ["appointments", "cake_preorders", "overview", "catalog"])
      expect(await configureModule(merchant, key, false)).toMatchObject({
        ok: false,
      });
    login(cashier);
    expect(await configureModule(merchant, "pos", false)).toMatchObject({
      ok: false,
    });
    login(editor);
    expect(await configureModule(merchant, "pos", false)).toMatchObject({
      ok: false,
    });
  });
  it("checks module license expiry and dependency access server-side", async () => {
    await database.query(
      "UPDATE business_module_entitlements SET expires_at=now()-interval '1 second' WHERE merchant_id=$1 AND module_key='pos'",
      [merchant],
    );
    await expect(authorize(merchant, "pos:operate")).rejects.toThrow(
      "Business module",
    );
    expect(await configureModule(merchant, "pos", true)).toMatchObject({
      ok: false,
    });
    await database.query(
      "UPDATE merchant_modules SET enabled=false WHERE merchant_id=$1 AND module_key='catalog'",
      [merchant],
    );
    await expect(authorize(merchant, "orders:manage")).rejects.toThrow(
      "Business module",
    );
  });
  it("changes recommendations without resetting merchant modules, content or entitlements", async () => {
    expect(await setBusinessType(merchant, "bakery")).toEqual({ ok: true });
    expect(
      (await merchantModuleState(merchant)).find((m) => m.key === "pos")
        ?.enabled,
    ).toBe(true);
    expect(await setBusinessType(merchant, "not-real")).toMatchObject({
      ok: false,
    });
    login(editor);
    expect(await setBusinessType(merchant, "cafe")).toMatchObject({
      ok: false,
    });
    await database.query(
      "UPDATE merchants SET business_type='cafe' WHERE id=$1",
      [merchant],
    );
  });
  it("loads Orders and settings without builder queries, but preserves cafe POS data", async () => {
    const orders = await dashboardData(undefined, undefined, "Orders");
    expect(
      executedQueries.some((query) =>
        /"(pages|menu_products|media_assets|component_definitions|store_products)"/.test(
          query,
        ),
      ),
    ).toBe(false);
    for (const key of [
      "pages",
      "products",
      "categories",
      "media",
      "catalog",
      "prices",
      "unlocked",
    ] as const)
      expect(orders?.[key]).toEqual([]);
    const pos = await dashboardData(undefined, undefined, "POS / Cashier");
    expect(pos?.products).toHaveLength(1);
    expect(pos?.categories).toHaveLength(1);
    expect(pos?.pages).toEqual([]);
    login(kitchen);
    const root = await dashboardData();
    expect(root?.pages).toEqual([]);
    expect(root?.products).toEqual([]);
    login(cashier);
    await expect(
      dashboardData(undefined, undefined, "Website Editor"),
    ).rejects.toThrow("Workspace permission required");
  });

  it("retains subscription write gates when modules have an included license", async () => {
    const expired = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await database.query(
      "INSERT INTO merchants(id,name,slug,trial_started_at,trial_ends_at) VALUES($1,'Expired','expired-modules',now()-interval '15 days',now()-interval '1 day')",
      [expired],
    );
    await database.query(
      "INSERT INTO merchant_users(merchant_id,user_id,role) VALUES($1,$2,'owner')",
      [expired, owner],
    );
    expect(await configureModule(expired, "pos", false)).toMatchObject({
      ok: false,
    });
    await expect(authorize(expired, "pos:operate")).resolves.toBeTruthy();
    await expect(
      createPosOrder(expired, {
        requestId: crypto.randomUUID(),
        items: [{ productId: product, quantity: 1, expectedPrice: 1000 }],
        fulfillment: "takeaway",
        tableLabel: "",
        note: "",
        payment: "unpaid",
      }),
    ).rejects.toThrow("Subscription required");
  });
  it("retains real cafe checkout and scoped order synchronization", async () => {
    login(cashier);
    const input = {
      requestId: crypto.randomUUID(),
      items: [{ productId: product, quantity: 1, expectedPrice: 1000 }],
      fulfillment: "takeaway" as const,
      tableLabel: "",
      note: "",
      payment: "cash" as const,
      cashReceived: 1200,
    };
    const ticket = await createPosOrder(merchant, input);
    expect(await createPosOrder(merchant, input)).toEqual(ticket);
    login(kitchen);
    const queue = await operationsSnapshot(merchant);
    expect(queue.orders.find((o) => o.id === ticket.orderId)).toMatchObject({
      status: "pending",
      total: 1000,
      changeDue: 200,
    });
  });
  it("blocks browser module writes and cross-tenant license reads", async () => {
    await browser(owner, async () => {
      expect(
        (
          await database.query(
            "SELECT * FROM business_module_entitlements WHERE merchant_id=$1",
            [other],
          )
        ).rows,
      ).toEqual([]);
      await expect(
        database.query(
          "UPDATE merchant_modules SET enabled=true WHERE merchant_id=$1",
          [merchant],
        ),
      ).rejects.toThrow();
      await expect(
        database.query(
          "INSERT INTO business_module_entitlements(merchant_id,module_key,source) VALUES($1,'appointments','provider')",
          [merchant],
        ),
      ).rejects.toThrow();
    });
  });
  it("enforces browser content and storage capabilities for new staff", async () => {
    await browser(cashier, async () => {
      expect((await database.query("SELECT * FROM pages")).rows).toEqual([]);
      expect(
        (await database.query("SELECT * FROM menu_products")).rows,
      ).toHaveLength(1);
      await expect(
        database.query(
          "INSERT INTO storage.objects(bucket_id,name) VALUES('merchant-media',$1)",
          [`${merchant}/blocked.png`],
        ),
      ).rejects.toThrow();
    });
    await browser(kitchen, async () => {
      expect(
        (await database.query("SELECT * FROM menu_products")).rows,
      ).toEqual([]);
    });
    await database.query(
      "UPDATE merchant_modules SET enabled=false WHERE merchant_id=$1 AND module_key='website'",
      [merchant],
    );
    await browser(editor, async () => {
      expect((await database.query("SELECT * FROM pages")).rows).toEqual([]);
    });
  });
});
