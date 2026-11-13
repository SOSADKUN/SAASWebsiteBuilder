import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { beforeAll, afterAll, describe, it, expect } from "vitest";

// Run the real generated SQL against PostgreSQL in WASM. Only Supabase's
// auth/storage host schemas are stubbed; application tables and RLS are real.
let database: PGlite;
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const merchantA = "33333333-3333-4333-8333-333333333333";
const merchantB = "44444444-4444-4444-8444-444444444444";
const categoryB = "55555555-5555-4555-8555-555555555555";
beforeAll(async () => {
  database = new PGlite();
  await database.exec(`
 CREATE ROLE anon;
 CREATE ROLE authenticated;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO anon, authenticated;
 GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
 CREATE SCHEMA storage;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage TO authenticated;
 GRANT SELECT, INSERT, DELETE ON storage.objects TO authenticated;
 CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name,'/') $$;
 GRANT EXECUTE ON FUNCTION storage.foldername(text) TO authenticated;
 `);
  for (const filename of (await readdir("drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (filename.startsWith("0002")) {
      await database.exec(
        "INSERT INTO merchants(id,name,slug,created_at) VALUES ('99999999-9999-4999-8999-999999999999','Existing business','existing-business','2020-01-01T00:00:00Z')",
      );
    }
    await database.exec(await readFile(`drizzle/${filename}`, "utf8"));
  }
  await database.exec(await readFile("supabase/policies.sql", "utf8"));
  await database.exec(`
 INSERT INTO user_profiles(id,name) VALUES ('${userA}','A'),('${userB}','B');
 INSERT INTO merchants(id,name,slug) VALUES ('${merchantA}','Café A','cafe-a'),('${merchantB}','Café B','cafe-b');
 INSERT INTO merchant_users(merchant_id,user_id) VALUES ('${merchantA}','${userA}'),('${merchantB}','${userB}');
 INSERT INTO menu_categories(id,merchant_id,name) VALUES ('${categoryB}','${merchantB}','B private menu');
 INSERT INTO component_definitions(key,name,category,premium) VALUES ('hero-split','Split hero','hero',true);
 `);
}, 60000);
afterAll(async () => {
  await database?.close();
});
async function asUser(role: string, id = userA) {
  await database.exec("RESET ROLE");
  await database.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
    id,
  ]);
  await database.exec(`SET ROLE ${role}`);
}
describe("PostgreSQL migrations and tenant RLS", () => {
  it("adds header version three idempotently while keeping old render metadata", async () => {
    await asUser("postgres");
    await database.exec(`INSERT INTO component_definitions(key,name,category) VALUES ('header-minimal','Minimal','header'),('header-centered','Centered','header'),('header-dark','Legacy dark','header');
      INSERT INTO component_versions(component_key,version,schema) SELECT key,2,'{"type":"object"}'::jsonb FROM component_definitions WHERE category='header';`);
    const migration = await readFile(
      "drizzle/0004_header_layout_versions.sql",
      "utf8",
    );
    await database.exec(migration);
    await database.exec(migration);
    const rows = await database.query<{ version: number; count: number }>(
      "SELECT version,count(*)::int AS count FROM component_versions WHERE component_key LIKE 'header-%' GROUP BY version ORDER BY version",
    );
    expect(rows.rows).toEqual([
      { version: 2, count: 3 },
      { version: 3, count: 3 },
    ]);
  });
  it("isolates order tickets and blocks browser order writes", async () => {
    await asUser("postgres");
    const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await database.query(
      "INSERT INTO pos_orders(id,merchant_id,number,request_id,fingerprint,fulfillment,total,payment,created_by) VALUES ($1,$2,1,$1,'test','takeaway',100,'unpaid',$3),($4,$5,1,$4,'test','takeaway',100,'unpaid',$6)",
      [a, merchantA, userA, b, merchantB, userB],
    );
    await database.query(
      "INSERT INTO pos_order_items(merchant_id,order_id,product_id,name,unit_price,quantity,line_total) VALUES ($1,$2,$2,'A ticket item',100,1,100),($3,$4,$4,'B ticket item',100,1,100)",
      [merchantA, a, merchantB, b],
    );
    await database.query(
      "INSERT INTO pos_order_events(merchant_id,order_id,version,kind,to_status,actor_id) VALUES ($1,$2,0,'created','pending',$3),($4,$5,0,'created','pending',$6)",
      [merchantA, a, userA, merchantB, b, userB],
    );
    await asUser("authenticated", userA);
    expect((await database.query("SELECT id FROM pos_orders")).rows).toEqual([
      { id: a },
    ]);
    expect(
      (await database.query("SELECT name FROM pos_order_items")).rows,
    ).toEqual([{ name: "A ticket item" }]);
    expect(
      (await database.query("SELECT order_id FROM pos_order_events")).rows,
    ).toEqual([{ order_id: a }]);
    expect(
      (await database.query("SELECT * FROM pos_order_counters")).rows,
    ).toEqual([]);
    await expect(
      database.exec("UPDATE pos_orders SET status='completed'"),
    ).rejects.toThrow(/permission denied/);
    await expect(database.exec("DELETE FROM pos_order_events")).rejects.toThrow(
      /permission denied/,
    );
    await asUser("authenticated", userB);
    expect((await database.query("SELECT id FROM pos_orders")).rows).toEqual([
      { id: b },
    ]);
    await asUser("postgres");
    await expect(
      database.query(
        "INSERT INTO pos_order_items(merchant_id,order_id,product_id,name,unit_price,quantity,line_total) VALUES ($1,$2,$3,'Cross tenant',100,1,100)",
        [merchantA, b, a],
      ),
    ).rejects.toThrow(/pos_item_order_tenant_fk/);
    await expect(
      database.query(
        "UPDATE pos_orders SET status='cancelled',cancelled_at=CURRENT_TIMESTAMP,cancel_reason=NULL WHERE id=$1",
        [a],
      ),
    ).rejects.toThrow(/pos_order_cancellation_valid/);
    await expect(
      database.exec("UPDATE pos_order_events SET reason='changed'"),
    ).rejects.toThrow(/append-only/);
  });
  it("backfills old trials without restarting or deleting existing merchants", async () => {
    await asUser("postgres");
    const result = await database.query<{
      name: string;
      days: number;
      status: string;
    }>(
      "SELECT m.name,extract(epoch from (m.trial_ends_at-m.trial_started_at))/86400 AS days,s.status FROM merchants m JOIN merchant_subscriptions s ON s.merchant_id=m.id WHERE m.slug='existing-business'",
    );
    expect(result.rows[0]).toMatchObject({
      name: "Existing business",
      status: "expired",
    });
    expect(Number(result.rows[0].days)).toBe(14);
  });
  it("automatically starts a merchant trial once and preserves it across staff and business updates", async () => {
    await asUser("postgres");
    const before = await database.query(
      "SELECT trial_started_at,trial_ends_at FROM merchants WHERE id=$1",
      [merchantA],
    );
    await database.query(
      "INSERT INTO merchant_users(merchant_id,user_id,role) VALUES ($1,$2,'editor')",
      [merchantA, userB],
    );
    await database.query(
      "UPDATE merchants SET name='Renamed business' WHERE id=$1",
      [merchantA],
    );
    expect(
      (
        await database.query(
          "SELECT trial_started_at,trial_ends_at FROM merchants WHERE id=$1",
          [merchantA],
        )
      ).rows,
    ).toEqual(before.rows);
    expect(
      (
        await database.query(
          "SELECT * FROM subscription_events WHERE merchant_id=$1 AND kind='trial_started'",
          [merchantA],
        )
      ).rows,
    ).toHaveLength(1);
    await database.query(
      "DELETE FROM merchant_users WHERE merchant_id=$1 AND user_id=$2",
      [merchantA, userB],
    );
    await expect(
      database.query(
        "UPDATE merchants SET trial_ends_at=CURRENT_TIMESTAMP+interval '100 days' WHERE id=$1",
        [merchantA],
      ),
    ).rejects.toThrow(/trial dates cannot be changed/);
  });
  it("denies browser writes to billing and scopes billing reads to each tenant", async () => {
    await asUser("authenticated");
    expect(
      (
        await database.query<{ merchant_id: string }>(
          "SELECT merchant_id FROM merchant_subscriptions",
        )
      ).rows,
    ).toEqual([{ merchant_id: merchantA }]);
    for (const query of [
      "UPDATE merchant_subscriptions SET status='active'",
      "UPDATE merchants SET trial_ends_at=CURRENT_TIMESTAMP+interval '100 days'",
      "INSERT INTO subscription_events(merchant_id,kind) VALUES ('" +
        merchantA +
        "','paid')",
      "INSERT INTO merchant_trial_claims(user_id,merchant_id) VALUES ('" +
        userA +
        "','" +
        merchantA +
        "')",
    ])
      await expect(database.exec(query)).rejects.toThrow(/permission denied/);
  });
  it("retains unique immutable trial claims and append-only event history", async () => {
    await asUser("postgres");
    await database.query(
      "INSERT INTO merchant_trial_claims(user_id,merchant_id) VALUES ($1,$2)",
      [userA, merchantA],
    );
    await expect(
      database.query(
        "INSERT INTO merchant_trial_claims(user_id,merchant_id) VALUES ($1,$2)",
        [userA, merchantB],
      ),
    ).rejects.toThrow(/duplicate key/);
    await expect(
      database.exec("DELETE FROM merchant_trial_claims"),
    ).rejects.toThrow(/append-only/);
    await expect(
      database.exec("UPDATE subscription_events SET kind='paid'"),
    ).rejects.toThrow(/append-only/);
  });
  it("rejects unverified paid access and audits verified server changes", async () => {
    await asUser("postgres");
    await expect(
      database.query(
        "UPDATE merchant_subscriptions SET status='active' WHERE merchant_id=$1",
        [merchantA],
      ),
    ).rejects.toThrow(/active_subscription_verified/);
    await database.query(
      "UPDATE merchant_subscriptions SET status='active',payment_verified_at=CURRENT_TIMESTAMP,verification_source='provider',current_period_ends_at=CURRENT_TIMESTAMP+interval '30 days' WHERE merchant_id=$1",
      [merchantA],
    );
    expect(
      (
        await database.query(
          "SELECT * FROM subscription_events WHERE merchant_id=$1 AND kind='subscription_changed'",
          [merchantA],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("blocks direct storage uploads after expiry but preserves tenant data reads", async () => {
    await asUser("postgres");
    // The migration fixture has an expired trial; give A membership without restarting it.
    const old = "99999999-9999-4999-8999-999999999999";
    await database.query(
      "INSERT INTO merchant_users(merchant_id,user_id,role) VALUES ($1,$2,'editor')",
      [old, userA],
    );
    await asUser("authenticated");
    expect(
      (await database.query("SELECT id FROM merchants WHERE id=$1", [old]))
        .rows,
    ).toHaveLength(1);
    await expect(
      database.query(
        "INSERT INTO storage.objects(bucket_id,name) VALUES ('merchant-media',$1)",
        [old + "/blocked.jpg"],
      ),
    ).rejects.toThrow(/row-level security/);
    await asUser("postgres");
    await database.query(
      "DELETE FROM merchant_users WHERE merchant_id=$1 AND user_id=$2",
      [old, userA],
    );
  });
  it("migrates all application tables and enables RLS", async () => {
    await asUser("postgres");
    const result = await database.query<{
      tablename: string;
      rowsecurity: boolean;
    }>("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public'");
    expect(result.rows).toHaveLength(22);
    expect(result.rows.every((t) => t.rowsecurity)).toBe(true);
  });
  it("only lets each merchant read its own business and menu records", async () => {
    await asUser("authenticated");
    expect(
      (await database.query<{ id: string }>("SELECT id FROM merchants")).rows,
    ).toEqual([{ id: merchantA }]);
    expect(
      (await database.query("SELECT * FROM menu_categories")).rows,
    ).toHaveLength(0);
    await asUser("authenticated", userB);
    expect(
      (await database.query<{ id: string }>("SELECT id FROM merchants")).rows,
    ).toEqual([{ id: merchantB }]);
    expect(
      (await database.query("SELECT * FROM menu_categories")).rows,
    ).toHaveLength(1);
  });
  it("prevents browser clients granting premium entitlements or admin roles", async () => {
    await asUser("authenticated");
    await expect(
      database.query(
        "INSERT INTO merchant_entitlements(merchant_id,component_key) VALUES ($1,'hero-split')",
        [merchantA],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      database.exec("UPDATE user_profiles SET role='admin'"),
    ).rejects.toThrow(/permission denied/);
  });
  it("denies anonymous access to all private merchant records", async () => {
    await asUser("anon");
    await expect(database.exec("SELECT * FROM pages")).rejects.toThrow(
      /permission denied/,
    );
    await expect(database.exec("SELECT * FROM merchants")).rejects.toThrow(
      /permission denied/,
    );
  });
  it("rejects cross-tenant category relationships even through a privileged connection", async () => {
    await asUser("postgres");
    await expect(
      database.query(
        "INSERT INTO menu_products(merchant_id,category_id,name,description,price) VALUES ($1,$2,'Bad product','',100)",
        [merchantA, categoryB],
      ),
    ).rejects.toThrow(/product_category_tenant_fk/);
  });
  it("checks tenant ownership on storage paths", async () => {
    await asUser("authenticated");
    await database.query(
      "INSERT INTO storage.objects(bucket_id,name) VALUES ('merchant-media',$1)",
      [`${merchantA}/coffee.jpg`],
    );
    await expect(
      database.query(
        "INSERT INTO storage.objects(bucket_id,name) VALUES ('merchant-media',$1)",
        [`${merchantB}/coffee.jpg`],
      ),
    ).rejects.toThrow(/row-level security/);
    expect(
      (await database.query("SELECT * FROM storage.objects")).rows,
    ).toHaveLength(1);
  });
});
