import { storagePolicySql } from "../src/lib/storage-policy";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile, readdir } from "node:fs/promises";
import { beforeAll, afterAll, beforeEach, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({
  db: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  exists: vi.fn(),
}));
vi.mock("@/db", () => ({ db: mock.db }));
vi.mock("@/lib/storage-admin", () => ({
  storageAdmin: () => ({
    storage: {
      from: () => ({
        upload: mock.upload,
        remove: mock.remove,
        exists: mock.exists,
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://example.test/${path}` },
        }),
        info: async () => ({ error: { message: "missing" } }),
      }),
    },
  }),
}));
vi.mock("@/lib/auth", () => ({
  authorize: vi.fn().mockResolvedValue({ id: "owner" }),
}));
import { removeMediaAsset } from "../src/server/workspace-service";
import * as schema from "../src/db/schema";
import {
  storeValidatedImage,
  storageSnapshot,
} from "../src/server/storage-service";
import { storageLimits, storageWarning } from "../src/lib/storage-policy";
let pg: PGlite;
const merchant = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT NULL::uuid$$;
 CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text,file_size_limit bigint,allowed_mime_types text[]);CREATE TABLE storage.objects(bucket_id text,name text UNIQUE,metadata jsonb);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA storage TO authenticated;GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;`);
  for (const f of (await readdir("drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await pg.exec(await readFile(`drizzle/${f}`, "utf8"));
  await pg.exec(
    storagePolicySql(await readFile("supabase/storage-quota.sql", "utf8")),
  );
  await pg.query(
    "INSERT INTO merchants(id,name,slug)VALUES($1,'A','quota-a'),($2,'B','quota-b')",
    [merchant, other],
  );
}, 180000);
beforeEach(async () => {
  await pg.exec(
    "RESET ROLE;DELETE FROM storage.objects;DELETE FROM media_assets;DELETE FROM media_upload_reservations;DELETE FROM merchant_storage_entitlements;",
  );
  mock.db.mockReturnValue(drizzle(pg, { schema }));
  mock.upload.mockImplementation(async (path: string, bytes: Uint8Array) => {
    await pg.query(
      "INSERT INTO storage.objects(bucket_id,name,metadata)VALUES('merchant-media',$1,$2)",
      [path, JSON.stringify({ size: bytes.length })],
    );
    return { error: null };
  });
});
afterAll(async () => {
  await pg?.close();
});
async function legacy(
  bytes: number,
  path = `${merchant}/old.png`,
  metadata: unknown = { size: bytes },
) {
  await pg.exec(
    "ALTER TABLE storage.objects DISABLE TRIGGER guard_company_media_insert",
  );
  await pg.query("INSERT INTO storage.objects VALUES('merchant-media',$1,$2)", [
    path,
    JSON.stringify(metadata),
  ]);
  await pg.exec(
    "ALTER TABLE storage.objects ENABLE TRIGGER guard_company_media_insert",
  );
}
const upload = (
  mid = merchant,
  id = crypto.randomUUID(),
  bytes = new Uint8Array(1024),
) => storeValidatedImage(mid, id, bytes, "png", "image/png", "test.png");
it("counts existing and orphaned objects without rewriting URLs", async () => {
  await legacy(100);
  await upload();
  expect(await storageSnapshot(merchant)).toEqual({
    used: 1124,
    reserved: 0,
    limit: storageLimits.trial,
  });
  expect((await storageSnapshot(other)).used).toBe(0);
});
it("reserves concurrent capacity before network uploads", async () => {
  await legacy(47 * 1024 * 1024);
  const results = await Promise.allSettled([
    upload(merchant, crypto.randomUUID(), new Uint8Array(2 * 1024 * 1024)),
    upload(merchant, crypto.randomUUID(), new Uint8Array(2 * 1024 * 1024)),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect((await storageSnapshot(merchant)).used).toBe(49 * 1024 * 1024);
});
it("keeps failed upload reservations; exact retries do not double count", async () => {
  const id = crypto.randomUUID();
  mock.upload.mockResolvedValueOnce({ error: { message: "network" } });
  await expect(upload(merchant, id)).rejects.toThrow("could not be confirmed");
  expect((await storageSnapshot(merchant)).reserved).toBe(1024);
  await upload(merchant, id);
  await upload(merchant, id);
  expect(await storageSnapshot(merchant)).toMatchObject({
    used: 1024,
    reserved: 0,
  });
  expect(mock.upload).toHaveBeenCalledTimes(2);
});
it("rejects cross-tenant retry IDs and changed content", async () => {
  const id = crypto.randomUUID();
  await upload(merchant, id);
  await expect(upload(other, id)).rejects.toThrow("does not match");
  await expect(upload(merchant, id, new Uint8Array(100))).rejects.toThrow(
    "does not match",
  );
});
it("does not grant higher storage for POS licenses; only separate verified storage", async () => {
  expect((await storageSnapshot(merchant)).limit).toBe(storageLimits.trial);
  await pg.query(
    "INSERT INTO merchant_storage_entitlements VALUES($1,now(),now()+interval '1 day','provider')",
    [merchant],
  );
  expect((await storageSnapshot(merchant)).limit).toBe(storageLimits.verified);
});
it("reduces expired trials to free capacity while preserving images", async () => {
  await legacy(30 * 1024 * 1024);
  await pg.exec("ALTER TABLE merchants DISABLE TRIGGER ALL");
  await pg.query(
    "UPDATE merchants SET trial_started_at='2000-01-01',trial_ends_at='2000-01-15' WHERE id=$1",
    [merchant],
  );
  await pg.exec("ALTER TABLE merchants ENABLE TRIGGER ALL");
  expect(await storageSnapshot(merchant)).toMatchObject({
    used: 30 * 1024 * 1024,
    limit: storageLimits.free,
  });
  await expect(upload()).rejects.toThrow("quota exceeded");
  expect((await pg.query("SELECT * FROM storage.objects")).rows).toHaveLength(
    1,
  );
  // Free Core can recover capacity and upload again after expiry.
  await pg.query(
    "INSERT INTO media_assets(merchant_id,path,url,name)VALUES($1,$2,'https://example.test/old.png','old.png')",
    [merchant, `${merchant}/old.png`],
  );
  const asset = (
    await pg.query<{ id: string }>(
      "SELECT id FROM media_assets WHERE merchant_id=$1",
      [merchant],
    )
  ).rows[0];
  mock.remove.mockImplementation(async (paths: string[]) => {
    await pg.query("DELETE FROM storage.objects WHERE name=$1", [paths[0]]);
    return { error: null };
  });
  mock.exists.mockResolvedValue({ data: false, error: null });
  await removeMediaAsset(merchant, asset.id);
  await upload();
  expect(await storageSnapshot(merchant)).toMatchObject({
    used: 1024,
    limit: storageLimits.free,
  });
  // Restore fixture via privileged test-only trigger suspension, never application code.
  await pg.exec("ALTER TABLE merchants DISABLE TRIGGER ALL");
  await pg.query(
    "UPDATE merchants SET trial_started_at=now(),trial_ends_at=now()+interval '14 days' WHERE id=$1",
    [merchant],
  );
  await pg.exec("ALTER TABLE merchants ENABLE TRIGGER ALL");
});
it("fails closed for legacy objects with unknown sizes", async () => {
  await legacy(0, `${merchant}/unknown.png`, {});
  await expect(upload()).rejects.toMatchObject({
    cause: expect.objectContaining({
      message: "Storage reconciliation required",
    }),
  });
});
it("denies direct API writes and private accounting even for arbitrary claimed tenants", async () => {
  await pg.exec("SET ROLE authenticated");
  try {
    await expect(
      pg.query(
        "INSERT INTO storage.objects VALUES('merchant-media',$1,'{\"size\":1}')",
        [`${merchant}/forged.png`],
      ),
    ).rejects.toThrow();
    await expect(
      pg.query("SELECT * FROM media_upload_reservations"),
    ).rejects.toThrow();
    await expect(
      pg.query("SELECT * FROM company_storage_snapshot($1)", [merchant]),
    ).rejects.toThrow();
  } finally {
    await pg.exec("RESET ROLE");
  }
});
it("rejects even privileged unreserved writes and guards late commits after cancellation", async () => {
  await expect(
    pg.query(
      "INSERT INTO storage.objects VALUES('merchant-media',$1,'{\"size\":1}')",
      [`${merchant}/late.png`],
    ),
  ).rejects.toThrow("reservation required");
});
it("reports quota thresholds exactly", () => {
  expect(
    [0.79, 0.8, 0.95, 1, 1.2].map((r) => storageWarning(r * 100, 100)),
  ).toEqual(["normal", "warning", "critical", "full", "full"]);
});

it("releases actual capacity only after confirmed storage deletion", async () => {
  await upload();
  const { rows } = await pg.query<{ id: string; path: string }>(
    "SELECT id,path FROM media_assets WHERE merchant_id=$1",
    [merchant],
  );
  mock.remove.mockImplementation(async () => {
    await pg.query("DELETE FROM storage.objects WHERE name=$1", [rows[0].path]);
    return { error: null };
  });
  mock.exists.mockResolvedValue({
    data: false,
    error: { code: "NoSuchKey", status: 404 },
  });
  await removeMediaAsset(merchant, rows[0].id);
  expect(await storageSnapshot(merchant)).toMatchObject({
    used: 0,
    reserved: 0,
  });
});
it("preserves quota and library records when deletion fails", async () => {
  await upload();
  const { rows } = await pg.query<{ id: string }>(
    "SELECT id FROM media_assets WHERE merchant_id=$1",
    [merchant],
  );
  mock.remove.mockResolvedValue({ error: { message: "network" } });
  await expect(removeMediaAsset(merchant, rows[0].id)).rejects.toThrow(
    "Storage removal failed",
  );
  expect((await storageSnapshot(merchant)).used).toBe(1024);
  expect((await pg.query("SELECT * FROM media_assets")).rows).toHaveLength(1);
});
it("releases only an absent image's reservation, preserves entitlements and stays nonnegative on retry", async () => {
  await upload();
  const { rows } = await pg.query<{ id: string; path: string }>(
    "SELECT id,path FROM media_assets WHERE merchant_id=$1",
    [merchant],
  );
  await pg.query(
    "INSERT INTO merchant_storage_entitlements(merchant_id,verified_at,expires_at,source) VALUES($1,now(),now()+interval '1 day','admin')",
    [merchant],
  );
  // Simulate an externally removed object, only in this disposable fixture.
  await pg.query("DELETE FROM storage.objects WHERE name=$1", [rows[0].path]);
  expect(await storageSnapshot(merchant)).toMatchObject({
    used: 0,
    reserved: 1024,
  });
  mock.remove.mockResolvedValue({ error: { code: "NoSuchKey", status: 404 } });
  mock.exists.mockResolvedValue({
    data: false,
    error: { code: "NoSuchKey", status: 404 },
  });
  await removeMediaAsset(merchant, rows[0].id);
  await removeMediaAsset(merchant, rows[0].id);
  expect(await storageSnapshot(merchant)).toMatchObject({
    used: 0,
    reserved: 0,
  });
  expect(
    (
      await pg.query(
        "SELECT * FROM merchant_storage_entitlements WHERE merchant_id=$1",
        [merchant],
      )
    ).rows,
  ).toHaveLength(1);
});
it("pending cancellation blocks a late storage commit without deleting an image", async () => {
  const id = crypto.randomUUID();
  mock.upload.mockResolvedValueOnce({ error: { message: "interrupted" } });
  await expect(upload(merchant, id)).rejects.toThrow();
  await pg.query("DELETE FROM media_upload_reservations WHERE id=$1", [id]);
  await expect(
    pg.query(
      "INSERT INTO storage.objects VALUES('merchant-media',$1,'{\"size\":1024}')",
      [`${merchant}/${id}.png`],
    ),
  ).rejects.toThrow("reservation required");
  expect((await storageSnapshot(merchant)).reserved).toBe(0);
});

it("retains records if a late object exists despite an absent API response", async () => {
  await upload();
  const { rows } = await pg.query<{ id: string }>(
    "SELECT id FROM media_assets WHERE merchant_id=$1",
    [merchant],
  );
  mock.remove.mockResolvedValue({ error: null });
  mock.exists.mockResolvedValue({ data: false, error: null });
  await expect(removeMediaAsset(merchant, rows[0].id)).rejects.toThrow(
    "Storage removal failed",
  );
  expect((await storageSnapshot(merchant)).used).toBe(1024);
  expect((await pg.query("SELECT * FROM media_assets")).rows).toHaveLength(1);
});

it("rejects size-changing replacements through direct privileged Storage writes", async () => {
  await upload();
  await expect(
    pg.query(
      "UPDATE storage.objects SET metadata='{\"size\":2048}' WHERE bucket_id='merchant-media' AND name LIKE $1",
      [`${merchant}/%`],
    ),
  ).rejects.toThrow("reservation required");
  expect((await storageSnapshot(merchant)).used).toBe(1024);
});
