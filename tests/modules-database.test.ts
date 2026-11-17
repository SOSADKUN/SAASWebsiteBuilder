import { storagePolicySql } from "../src/lib/storage-policy";
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
import {
  configureModule,
  configureSystemService,
  setBusinessType,
} from "../src/server/module-actions";
import {
  saveLayout,
  createPage,
  saveProduct,
  saveCategory,
  updateBusiness,
  startBusinessSetup,
} from "../src/server/actions";
import { saveBusinessSetup } from "../src/server/onboarding-actions";
import {
  merchantModuleState,
  requireModule,
} from "../src/server/module-service";
import { dashboardData } from "../src/server/queries";
import { initialLayout, definitions } from "../src/lib/models";
import {
  createPosOrder,
  operationsSnapshot,
  changePosOrder,
  acknowledgePosCancellation,
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
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,metadata jsonb);
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
  await database.exec(
    storagePolicySql(await readFile("supabase/storage-quota.sql", "utf8")),
  );
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
    expect(await configureModule(merchant, "kitchen_queue", false)).toEqual({
      ok: true,
    });
    expect(await configureModule(merchant, "fnb_orders", false)).toEqual({
      ok: true,
    });
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
    // Expiring a legacy row does not revoke a legitimate active trial.
    await expect(
      requireModule(merchant, "pos", "write"),
    ).resolves.toBeUndefined();
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

  it("retains history but denies new paid operations after trial expiry", async () => {
    const expired = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await database.query(
      "INSERT INTO merchants(id,name,slug,trial_started_at,trial_ends_at) VALUES($1,'Expired','expired-modules',now()-interval '15 days',now()-interval '1 day')",
      [expired],
    );
    await database.query(
      "INSERT INTO merchant_users(merchant_id,user_id,role) VALUES($1,$2,'owner')",
      [expired, owner],
    );
    expect(await configureModule(expired, "pos", true)).toMatchObject({
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
    ).rejects.toThrow("Business module");
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

async function freshSetup() {
  const actor = crypto.randomUUID();
  login(actor);
  const form = new FormData();
  form.set("ownerName", "Business Owner");
  form.set("name", "Setup business");
  form.set("slug", "setup-" + actor);
  const result = await startBusinessSetup(form);
  if (!result.ok) throw new Error(result.error);
  return { actor, form, id: result.merchantId };
}
async function setupRow(id: string) {
  return (
    await database.query<{
      onboarding_step: string;
      onboarding_services: string[];
      trial_started_at: Date;
      trial_ends_at: Date;
      business_type: string;
    }>(
      "SELECT onboarding_step,onboarding_services,trial_started_at,trial_ends_at,business_type FROM merchants WHERE id=$1",
      [id],
    )
  ).rows[0];
}
describe("resumable System Services onboarding", () => {
  it("cannot turn a database-disabled implementation into an enabled service", async () => {
    const setup = await freshSetup();
    await saveBusinessSetup(setup.id, {
      step: "business_type",
      businessType: "cafe",
    });
    await database.query(
      "UPDATE business_module_definitions SET available=false WHERE key='pos'",
    );
    try {
      expect(
        await saveBusinessSetup(setup.id, {
          step: "services",
          services: ["pos"],
        }),
      ).toMatchObject({ ok: false });
      expect(
        (await merchantModuleState(setup.id)).find((m) => m.key === "pos")
          ?.enabled,
      ).toBe(false);
    } finally {
      await database.query(
        "UPDATE business_module_definitions SET available=true WHERE key='pos'",
      );
    }
  });
  it("creates business details once, saves the owner name and keeps optional modules inactive", async () => {
    const setup = await freshSetup();
    const before = await setupRow(setup.id);
    expect(before.onboarding_step).toBe("business_type");
    expect(
      (await merchantModuleState(setup.id))
        .filter((m) => m.enabled)
        .map((m) => m.key)
        .sort(),
    ).toEqual([
      "business",
      "catalog",
      "media",
      "overview",
      "settings",
      "website",
    ]);
    expect(
      (
        await database.query("SELECT name FROM user_profiles WHERE id=$1", [
          setup.actor,
        ])
      ).rows[0],
    ).toMatchObject({ name: "Business Owner" });
    const replay = await startBusinessSetup(setup.form);
    expect(replay).toEqual({ ok: true, merchantId: setup.id });
    expect(await setupRow(setup.id)).toEqual(before);
    expect(
      (
        await database.query("SELECT * FROM merchant_users WHERE user_id=$1", [
          setup.actor,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(await configureSystemService(setup.id, "pos", true)).toMatchObject({
      ok: false,
    });
    await expect(authorize(setup.id, "pos:operate")).rejects.toThrow(
      "Business module",
    );
  });
  it("serializes repeated first submissions into one merchant and one immutable trial claim", async () => {
    const actor = crypto.randomUUID();
    login(actor);
    const form = new FormData();
    form.set("ownerName", "Owner");
    form.set("name", "Concurrent setup");
    form.set("slug", "retry-" + actor);
    const results = await Promise.all([
      startBusinessSetup(form),
      startBusinessSetup(form),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(results[0].ok).toBe(true);
    expect(
      (
        await database.query(
          "SELECT * FROM merchant_trial_claims WHERE user_id=$1",
          [actor],
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await database.query("SELECT * FROM merchant_users WHERE user_id=$1", [
          actor,
        ])
      ).rows,
    ).toHaveLength(1);
  });
  it("saves type and selection progress and resumes without loading builder datasets", async () => {
    const setup = await freshSetup();
    const before = await setupRow(setup.id);
    expect(
      await saveBusinessSetup(setup.id, {
        step: "business_type",
        businessType: "bakery",
      }),
    ).toEqual({ ok: true });
    expect((await setupRow(setup.id)).onboarding_services).toContain("orders");
    expect(
      await saveBusinessSetup(setup.id, {
        step: "service_draft",
        services: [],
      }),
    ).toEqual({ ok: true });
    const context = await dashboardData();
    expect(context?.business.onboardingStep).toBe("services");
    expect(context?.business.onboardingServices).toEqual([]);
    expect(context?.pages).toEqual([]);
    expect(context?.ownerName).toBe("Business Owner");
    const after = await setupRow(setup.id);
    expect(after.trial_started_at).toEqual(before.trial_started_at);
    expect(after.trial_ends_at).toEqual(before.trial_ends_at);
    expect(
      await saveBusinessSetup(setup.id, { step: "complete" }),
    ).toMatchObject({ ok: false });
  });
  it("finishes with selected included tools and no paid modules without restarting the trial", async () => {
    const setup = await freshSetup();
    const before = await setupRow(setup.id);
    await saveBusinessSetup(setup.id, {
      step: "business_type",
      businessType: "hair_salon",
    });
    expect(
      await saveBusinessSetup(setup.id, {
        step: "services",
        services: [],
      }),
    ).toEqual({ ok: true });
    expect(await saveBusinessSetup(setup.id, { step: "complete" })).toEqual({
      ok: true,
    });
    const context = await dashboardData();
    expect(context?.business.onboardingStep).toBe("complete");
    expect(context?.pages).toHaveLength(1);
    expect(context?.modules.find((m) => m.key === "pos")?.enabled).toBe(false);
    expect(context?.modules.find((m) => m.key === "website")?.enabled).toBe(
      true,
    );
    expect(context?.subscription.status).toBe("trialing");
    expect(await saveBusinessSetup(setup.id, { step: "complete" })).toEqual({
      ok: true,
    });
    expect(await startBusinessSetup(setup.form)).toEqual({
      ok: true,
      merchantId: setup.id,
    });
    const after = await setupRow(setup.id);
    expect(after.trial_started_at).toEqual(before.trial_started_at);
    expect(after.trial_ends_at).toEqual(before.trial_ends_at);
  });
  it("allows core-only onboarding with every optional service deselected", async () => {
    const setup = await freshSetup();
    await saveBusinessSetup(setup.id, {
      step: "business_type",
      businessType: "other",
    });
    expect(
      await saveBusinessSetup(setup.id, { step: "services", services: [] }),
    ).toEqual({ ok: true });
    expect(await saveBusinessSetup(setup.id, { step: "complete" })).toEqual({
      ok: true,
    });
    expect(
      (await merchantModuleState(setup.id))
        .filter((m) => m.enabled)
        .map((m) => m.key)
        .sort(),
    ).toEqual([
      "business",
      "catalog",
      "media",
      "overview",
      "settings",
      "website",
    ]);
    expect((await dashboardData())?.business.onboardingStep).toBe("complete");
    await expect(authorize(setup.id, "data:export")).resolves.toBeTruthy();
  });
  it("rejects future and missing-source selections while authorizing explicit trials independently of legacy licenses", async () => {
    const setup = await freshSetup();
    await saveBusinessSetup(setup.id, {
      step: "business_type",
      businessType: "cafe",
    });
    for (const services of [
      ["appointments"],
      ["cake_preorders"],
      ["orders", "catalog"],
      ["fake-service"],
    ])
      expect(
        await saveBusinessSetup(setup.id, { step: "services", services }),
      ).toMatchObject({ ok: false });
    await database.query(
      "UPDATE business_module_entitlements SET expires_at=now()-interval '1 second' WHERE merchant_id=$1 AND module_key='pos'",
      [setup.id],
    );
    expect(
      await saveBusinessSetup(setup.id, {
        step: "services",
        services: ["pos"],
      }),
    ).toEqual({ ok: true });
    expect(
      (await merchantModuleState(setup.id)).find((m) => m.key === "pos")
        ?.entitlementSource,
    ).toBe("trial");
    expect(
      (
        await database.query(
          "SELECT * FROM business_module_entitlements WHERE merchant_id=$1 AND module_key='appointments'",
          [setup.id],
        )
      ).rows,
    ).toEqual([]);
  });
  it("rechecks licenses at final confirmation instead of trusting a saved checkbox", async () => {
    const setup = await freshSetup();
    await saveBusinessSetup(setup.id, {
      step: "business_type",
      businessType: "cafe",
    });
    await saveBusinessSetup(setup.id, {
      step: "services",
      services: ["pos"],
    });
    await database.query(
      "UPDATE business_module_definitions SET trial_eligible=false WHERE key='pos'",
    );
    expect(
      await saveBusinessSetup(setup.id, { step: "complete" }),
    ).toMatchObject({ ok: false });
    expect((await setupRow(setup.id)).onboarding_step).toBe("review");
    expect(
      (await merchantModuleState(setup.id)).find((m) => m.key === "pos")
        ?.enabled,
    ).toBe(false);
    await database.query(
      "UPDATE business_module_definitions SET trial_eligible=true WHERE key='pos'",
    );
  });
  it("denies foreign-tenant and non-owner onboarding and service changes", async () => {
    const setup = await freshSetup();
    login(owner);
    expect(
      await saveBusinessSetup(setup.id, {
        step: "business_type",
        businessType: "bakery",
      }),
    ).toMatchObject({ ok: false });
    expect(await configureSystemService(setup.id, "pos", true)).toMatchObject({
      ok: false,
    });
    login(cashier);
    expect(await configureSystemService(merchant, "pos", true)).toMatchObject({
      ok: false,
    });
    expect((await setupRow(setup.id)).business_type).toBe("cafe");
  });
  it("does not make an expired trial writable through onboarding, while allowing core-only completion", async () => {
    const id = crypto.randomUUID();
    await database.query(
      "INSERT INTO merchants(id,name,slug,onboarding_step,trial_started_at,trial_ends_at) VALUES($1,'Expired setup',$2,'services',now()-interval '20 days',now()-interval '6 days')",
      [id, "expired-" + id],
    );
    await database.query(
      "INSERT INTO merchant_users(merchant_id,user_id,role) VALUES($1,$2,'owner')",
      [id, owner],
    );
    await database.query(
      "UPDATE merchant_modules SET enabled=false WHERE merchant_id=$1 AND module_key NOT IN ('overview','business','settings')",
      [id],
    );
    const before = await setupRow(id);
    await saveBusinessSetup(id, {
      step: "services",
      services: ["pos"],
    });
    expect(await saveBusinessSetup(id, { step: "complete" })).toMatchObject({
      ok: false,
    });
    await saveBusinessSetup(id, { step: "services", services: [] });
    expect(await saveBusinessSetup(id, { step: "complete" })).toEqual({
      ok: true,
    });
    expect((await setupRow(id)).trial_ends_at).toEqual(before.trial_ends_at);
    await expect(authorize(id, "data:export")).resolves.toBeTruthy();
  });
  it("requires operational-data confirmation and preserves tickets through disable/reactivation", async () => {
    const setup = await freshSetup();
    const before = await setupRow(setup.id);
    await saveBusinessSetup(setup.id, {
      step: "business_type",
      businessType: "cafe",
    });
    await saveBusinessSetup(setup.id, {
      step: "services",
      services: ["pos", "orders"],
    });
    await saveBusinessSetup(setup.id, { step: "complete" });
    const categoryId = (
      await database.query<{ id: string }>(
        "SELECT id FROM menu_categories WHERE merchant_id=$1 LIMIT 1",
        [setup.id],
      )
    ).rows[0].id;
    const productId = crypto.randomUUID();
    await database.query(
      "INSERT INTO menu_products(id,merchant_id,category_id,name,description,price) VALUES($1,$2,$3,'Product','',1000)",
      [productId, setup.id, categoryId],
    );
    const ticket = await createPosOrder(setup.id, {
      requestId: crypto.randomUUID(),
      items: [{ productId, quantity: 1, expectedPrice: 1000 }],
      fulfillment: "takeaway",
      tableLabel: "",
      note: "",
      payment: "cash",
      cashReceived: 1000,
    });
    expect(
      await configureSystemService(setup.id, "pos", false, true),
    ).toMatchObject({ ok: false });
    expect(
      await configureSystemService(setup.id, "orders", false, true),
    ).toMatchObject({ ok: false, confirmationRequired: false });
    await changePosOrder(setup.id, {
      orderId: ticket.orderId,
      version: 0,
      status: "cancelled",
      reason: "Customer cancelled",
    });
    await acknowledgePosCancellation(setup.id, {
      orderId: ticket.orderId,
      version: 1,
    });
    expect(
      await configureSystemService(setup.id, "orders", false),
    ).toMatchObject({ ok: false, confirmationRequired: true });
    expect(
      (await merchantModuleState(setup.id)).find(
        (m) => m.key === "kitchen_queue",
      )?.enabled,
    ).toBe(true);
    expect(
      await configureSystemService(setup.id, "orders", false, true),
    ).toEqual({ ok: true });
    expect(await configureSystemService(setup.id, "pos", false)).toMatchObject({
      confirmationRequired: true,
    });
    expect(await configureSystemService(setup.id, "pos", false, true)).toEqual({
      ok: true,
    });
    expect(
      (
        await database.query("SELECT id,status FROM pos_orders WHERE id=$1", [
          ticket.orderId,
        ])
      ).rows[0],
    ).toMatchObject({ id: ticket.orderId, status: "cancelled" });
    expect(await configureSystemService(setup.id, "orders", true)).toEqual({
      ok: true,
    });
    expect(
      (await operationsSnapshot(setup.id)).orders.find(
        (o) => o.id === ticket.orderId,
      ),
    ).toBeTruthy();
    expect((await setupRow(setup.id)).trial_ends_at).toEqual(
      before.trial_ends_at,
    );
  });
  it("retains existing completed merchants and legacy source-less queue access", async () => {
    expect((await setupRow(merchant)).onboarding_step).toBe("complete");
    await database.query(
      "UPDATE merchant_modules SET enabled=false WHERE merchant_id=$1 AND module_key='pos'",
      [merchant],
    );
    await expect(authorize(merchant, "orders:manage")).resolves.toBeTruthy();
    expect(
      (
        await database.query(
          "SELECT source FROM merchant_entitlements WHERE merchant_id=$1",
          [merchant],
        )
      ).rows[0],
    ).toMatchObject({ source: "demo" });
  });
});

// Phase B regressions use the real authorization helpers and all SQL migrations.
async function expiredCompany() {
  const id = crypto.randomUUID();
  await database.query(
    "INSERT INTO merchants(id,name,slug,trial_started_at,trial_ends_at)VALUES($1,'Free company',$2,now()-interval '20 days',now()-interval '6 days')",
    [id, "free-" + id],
  );
  await database.query(
    "INSERT INTO merchant_users(merchant_id,user_id,role)VALUES($1,$2,'owner')",
    [id, owner],
  );
  return id;
}
describe("permanent Free Core and company service trials", () => {
  it("creates only included Core licenses and immutable dated service trials, with no billing activation", async () => {
    const setup = await freshSetup();
    const row = await setupRow(setup.id);
    expect(+new Date(row.trial_ends_at) - +new Date(row.trial_started_at)).toBe(
      14 * 86400000,
    );
    const trials = await database.query<{
      module_key: string;
      starts_at: Date;
      ends_at: Date;
    }>("SELECT * FROM merchant_module_trials WHERE merchant_id=$1", [setup.id]);
    expect(trials.rows.map((t) => t.module_key).sort()).toEqual([
      "fnb_orders",
      "kitchen_queue",
      "pos",
    ]);
    for (const t of trials.rows) {
      expect(t.starts_at).toEqual(row.trial_started_at);
      expect(t.ends_at).toEqual(row.trial_ends_at);
    }
    const licenses = await database.query<{
      module_key: string;
      source: string;
      verified_at: null;
    }>("SELECT * FROM business_module_entitlements WHERE merchant_id=$1", [
      setup.id,
    ]);
    expect(licenses.rows).toHaveLength(6);
    expect(
      licenses.rows.every(
        (e) =>
          e.source === "included" &&
          e.verified_at === null &&
          !["pos", "fnb_orders", "kitchen_queue"].includes(e.module_key),
      ),
    ).toBe(true);
    expect(
      (
        await database.query(
          "SELECT status,payment_verified_at FROM merchant_subscriptions WHERE merchant_id=$1",
          [setup.id],
        )
      ).rows[0],
    ).toMatchObject({ status: "trialing", payment_verified_at: null });
    await expect(
      database.query(
        "INSERT INTO merchant_module_trials(merchant_id,module_key,starts_at,ends_at)VALUES($1,'appointments',now(),now()+interval '14 days')",
        [setup.id],
      ),
    ).rejects.toThrow("Invalid service trial");
    await expect(
      database.query(
        "UPDATE merchant_module_trials SET ends_at=now()+interval '90 days' WHERE merchant_id=$1",
        [setup.id],
      ),
    ).rejects.toThrow("immutable");
    await expect(
      database.query(
        "DELETE FROM merchant_module_trials WHERE merchant_id=$1",
        [setup.id],
      ),
    ).rejects.toThrow("immutable");
    expect(
      await browser(owner, () =>
        database.query(
          "SELECT * FROM merchant_module_trials WHERE merchant_id=$1",
          [setup.id],
        ),
      ),
    ).toMatchObject({ rows: [] }); // freshSetup uses a different owner
    await expect(
      browser(setup.actor, () =>
        database.query(
          "UPDATE merchant_module_trials SET ends_at=now() WHERE merchant_id=$1",
          [setup.id],
        ),
      ),
    ).rejects.toThrow();
  });
  it("does not shorten a legitimate trial when a verified license has an earlier end", async () => {
    const setup = await freshSetup();
    const before = await setupRow(setup.id);
    await database.query(
      "INSERT INTO business_module_entitlements(merchant_id,module_key,source,verified_at,expires_at)VALUES($1,'pos','admin',now(),now()+interval '1 day')",
      [setup.id],
    );
    const pos = (await merchantModuleState(setup.id)).find(
      (m) => m.key === "pos",
    );
    expect(pos).toMatchObject({
      entitled: true,
      entitlementSource: "trial",
      expiresAt: before.trial_ends_at.toISOString(),
    });
  });
  it("allows every implemented eligible service for a non-recommended business without restarting its trial", async () => {
    const setup = await freshSetup();
    const before = await setupRow(setup.id);
    expect(
      await saveBusinessSetup(setup.id, {
        step: "business_type",
        businessType: "hair_salon",
      }),
    ).toEqual({ ok: true });
    expect(
      await saveBusinessSetup(setup.id, {
        step: "services",
        services: ["pos", "orders"],
      }),
    ).toEqual({ ok: true });
    expect(await saveBusinessSetup(setup.id, { step: "complete" })).toEqual({
      ok: true,
    });
    for (const key of ["pos", "fnb_orders", "kitchen_queue"])
      await expect(
        requireModule(setup.id, key, "write"),
      ).resolves.toBeUndefined();
    expect(await configureSystemService(setup.id, "orders", false)).toEqual({
      ok: true,
    });
    expect(await configureSystemService(setup.id, "orders", true)).toEqual({
      ok: true,
    });
    expect((await setupRow(setup.id)).trial_ends_at).toEqual(
      before.trial_ends_at,
    );
    expect(
      (
        await database.query(
          "SELECT * FROM business_module_entitlements WHERE merchant_id=$1 AND module_key IN ('pos','fnb_orders','kitchen_queue')",
          [setup.id],
        )
      ).rows,
    ).toEqual([]);
  });
  it("keeps Dashboard, business, catalog, multi-page draft and publish available after expiry; premium ownership stays separate", async () => {
    const id = await expiredCompany();
    const site = await database.query<{ id: string }>(
      "INSERT INTO websites(merchant_id,title)VALUES($1,'Free site')RETURNING id",
      [id],
    );
    await createPage(id, "Contact", "/contact");
    await createPage(id, "About", "/about");
    const layout = initialLayout("Free site");
    // Register the existing deployed catalog; this does not grant ownership.
    for (const d of definitions) {
      await database.query(
        "INSERT INTO component_definitions(key,name,category,premium)VALUES($1,$2,$3,$4)ON CONFLICT(key)DO NOTHING",
        [d.key, d.name, d.type, d.premium],
      );
      await database.query(
        "INSERT INTO component_versions(component_key,version,schema)VALUES($1,$2,'{}')ON CONFLICT DO NOTHING",
        [d.key, d.version],
      );
    }
    const page = await database.query<{ id: string }>(
      "SELECT id FROM pages WHERE merchant_id=$1 AND path='/about'",
      [id],
    );
    await saveLayout(id, page.rows[0].id, layout, 0);
    await saveLayout(id, page.rows[0].id, layout, 1, true);
    expect(
      (
        await database.query("SELECT published FROM pages WHERE id=$1", [
          page.rows[0].id,
        ])
      ).rows[0],
    ).toMatchObject({ published: layout });
    await expect(
      database.query(
        "INSERT INTO websites(merchant_id,title)VALUES($1,'Second property')",
        [id],
      ),
    ).rejects.toThrow();
    expect(
      (
        await database.query("SELECT * FROM pages WHERE website_id=$1", [
          site.rows[0].id,
        ])
      ).rows,
    ).toHaveLength(2);
    await saveCategory(id, "Free category");
    const cat = await database.query<{ id: string }>(
      "SELECT id FROM menu_categories WHERE merchant_id=$1",
      [id],
    );
    await saveProduct(id, {
      name: "Free product",
      description: "",
      price: 100,
      image: "",
      categoryId: cat.rows[0].id,
      available: true,
      position: 0,
    });
    const form = new FormData();
    for (const [k, v] of Object.entries({
      name: "Updated company",
      description: "",
      address: "",
      hours: "",
      phone: "",
    }))
      form.set(k, v);
    await updateBusiness(id, form);
    const viewer = crypto.randomUUID();
    await database.query(
      "INSERT INTO user_profiles(id,name)VALUES($1,'Free Core owner')",
      [viewer],
    );
    await database.query(
      "INSERT INTO merchant_users(merchant_id,user_id,role)VALUES($1,$2,'owner')",
      [id, viewer],
    );
    login(viewer);
    expect((await dashboardData())?.business.id).toBe(id);
    login();
    await expect(authorize(id, "data:export")).resolves.toBeTruthy();
    await expect(
      requireModule(id, "overview", "read"),
    ).resolves.toBeUndefined();
    for (const key of ["website", "media", "catalog", "business", "settings"])
      await expect(requireModule(id, key, "write")).resolves.toBeUndefined();
    const premium = structuredClone(layout);
    premium[0] = { ...premium[0], key: "header-centered", version: 3 };
    await expect(saveLayout(id, page.rows[0].id, premium, 2)).rejects.toThrow();
    expect(
      (
        await database.query(
          "SELECT * FROM merchant_entitlements WHERE merchant_id=$1",
          [id],
        )
      ).rows,
    ).toEqual([]);
    await database.query(
      "INSERT INTO merchant_entitlements(merchant_id,component_key,source)VALUES($1,'header-centered','demo')",
      [id],
    );
    await saveLayout(id, page.rows[0].id, premium, 2);
    await saveLayout(id, page.rows[0].id, premium, 3, true);
    await expect(authorize(other, "website:manage")).rejects.toThrow(
      "Business access denied",
    );
  });
  it("requires company-specific verified service periods after expiry, ignoring legacy and base-subscription activation", async () => {
    const id = await expiredCompany();
    const foreign = await expiredCompany();
    await database.query(
      "INSERT INTO business_module_entitlements(merchant_id,module_key,source)VALUES($1,'pos','legacy')",
      [id],
    );
    await expect(requireModule(id, "pos", "read")).resolves.toBeUndefined();
    await expect(requireModule(id, "pos", "write")).rejects.toThrow(
      "Business module",
    );
    await database.query(
      "UPDATE merchant_subscriptions SET status='active',payment_verified_at=now(),verification_source='admin',current_period_ends_at=now()+interval '30 days' WHERE merchant_id=$1",
      [id],
    );
    await expect(requireModule(id, "pos", "write")).rejects.toThrow(
      "Business module",
    );
    await database.query(
      "UPDATE business_module_entitlements SET source='provider',expires_at=now()+interval '30 days' WHERE merchant_id=$1 AND module_key='pos'",
      [id],
    );
    await expect(requireModule(id, "pos", "write")).rejects.toThrow(
      "Business module",
    );
    await database.query(
      "UPDATE business_module_entitlements SET verified_at=now() WHERE merchant_id=$1 AND module_key='pos'",
      [id],
    );
    await expect(requireModule(id, "pos", "write")).resolves.toBeUndefined();
    await expect(requireModule(foreign, "pos", "write")).rejects.toThrow(
      "Business module",
    );
    await expect(requireModule(id, "kitchen_queue", "write")).rejects.toThrow(
      "Business module",
    );
    const check = await browser(owner, () =>
      database.query(
        "SELECT can_use_business_module($1,'website') AS core,can_use_business_module($1,'pos') AS pos,can_use_business_module($2,'pos') AS foreign,has_business_module($2,'pos') AS history",
        [id, foreign],
      ),
    );
    expect(check.rows[0]).toEqual({
      core: true,
      pos: true,
      foreign: false,
      history: true,
    });
    await expect(
      browser(owner, () =>
        database.query(
          "UPDATE business_module_entitlements SET verified_at=now() WHERE merchant_id=$1",
          [foreign],
        ),
      ),
    ).rejects.toThrow();
  });
  it("retains expired ticket reconciliation, completion, cancellation and acknowledgement while denying new orders", async () => {
    const id = await expiredCompany();
    const cat = await database.query<{ id: string }>(
      "INSERT INTO menu_categories(merchant_id,name)VALUES($1,'Products') RETURNING id",
      [id],
    );
    await database.query(
      "INSERT INTO menu_products(id,merchant_id,category_id,name,description,price)VALUES($1,$2,$3,'Retained product','',1000)",
      [crypto.randomUUID(), id, cat.rows[0].id],
    );
    const p = (
      await database.query<{ id: string }>(
        "SELECT id FROM menu_products WHERE merchant_id=$1",
        [id],
      )
    ).rows[0].id;
    await database.query(
      "INSERT INTO business_module_entitlements(merchant_id,module_key,source,verified_at,expires_at)VALUES($1,'pos','admin',now()-interval '1 day',now()+interval '1 day')",
      [id],
    );
    const input = {
      requestId: crypto.randomUUID(),
      items: [{ productId: p, quantity: 1, expectedPrice: 1000 }],
      fulfillment: "takeaway" as const,
      tableLabel: "",
      note: "",
      payment: "unpaid" as const,
    };
    const ticket = await createPosOrder(id, input);
    const cancel = await createPosOrder(id, {
      ...input,
      requestId: crypto.randomUUID(),
    });
    await database.query(
      "UPDATE business_module_entitlements SET expires_at=now()-interval '1 second' WHERE merchant_id=$1 AND module_key='pos'",
      [id],
    );
    expect(await createPosOrder(id, input)).toEqual(ticket);
    await expect(
      createPosOrder(id, { ...input, requestId: crypto.randomUUID() }),
    ).rejects.toThrow("Business module");
    await expect(
      createPosOrder(id, { ...input, note: "different" }),
    ).rejects.toMatchObject({ code: "REQUEST_REUSED" });
    expect(
      (await operationsSnapshot(id)).orders.some(
        (o) => o.id === ticket.orderId,
      ),
    ).toBe(true);
    let version = 0;
    for (const status of ["preparing", "ready", "completed"] as const) {
      await changePosOrder(id, {
        orderId: ticket.orderId,
        version: version++,
        status,
        reason: "",
      });
    }
    await changePosOrder(id, {
      orderId: cancel.orderId,
      version: 0,
      status: "cancelled",
      reason: "Customer cancelled",
    });
    await acknowledgePosCancellation(id, {
      orderId: cancel.orderId,
      version: 1,
    });
    expect(
      (
        await database.query(
          "SELECT status FROM pos_orders WHERE merchant_id=$1 ORDER BY number",
          [id],
        )
      ).rows,
    ).toEqual([{ status: "completed" }, { status: "cancelled" }]);
    expect(
      (
        await database.query(
          "SELECT payment_verified_at FROM merchant_subscriptions WHERE merchant_id=$1",
          [id],
        )
      ).rows[0],
    ).toMatchObject({ payment_verified_at: null });
  });
});
