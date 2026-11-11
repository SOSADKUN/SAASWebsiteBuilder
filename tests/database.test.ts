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
    .sort())
    await database.exec(await readFile(`drizzle/${filename}`, "utf8"));
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
  it("migrates all application tables and enables RLS", async () => {
    await asUser("postgres");
    const result = await database.query<{
      tablename: string;
      rowsecurity: boolean;
    }>("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public'");
    expect(result.rows).toHaveLength(14);
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
