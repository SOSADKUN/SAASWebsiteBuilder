import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile, readdir } from "node:fs/promises";
import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  authorize: vi.fn(),
  remove: vi.fn(),
  exists: vi.fn(),
  from: vi.fn(),
  subscription: vi.fn(),
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({
  authorize: mocks.authorize,
  supabase: async () => ({ storage: { from: mocks.from } }),
}));
vi.mock("@/lib/subscription-service", () => ({
  requireSubscription: mocks.subscription,
}));
import * as schema from "../src/db/schema";
import {
  loadOverviewMetrics,
  removeMediaAsset,
} from "../src/server/workspace-service";
let database: PGlite;
const merchant = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  actor = "33333333-3333-4333-8333-333333333333";
beforeAll(async () => {
  database = new PGlite();
  await database.exec(
    "CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;",
  );
  for (const file of (await readdir("drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await database.exec(await readFile(`drizzle/${file}`, "utf8"));
  await database.query(
    "INSERT INTO merchants(id,name,slug)VALUES($1,'A','a'),($2,'B','b')",
    [merchant, other],
  );
  await database.query(
    "INSERT INTO user_profiles(id,name)VALUES($1,'Owner'),($2,'Editor')",
    [actor, other],
  );
  await database.query(
    "INSERT INTO merchant_users(merchant_id,user_id,role)VALUES($1,$2,'owner'),($1,$3,'editor'),($3,$3,'owner')",
    [merchant, actor, other],
  );
}, 60000);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.mockReturnValue(drizzle(database, { schema }));
  mocks.authorize.mockResolvedValue({ id: actor });
  mocks.subscription.mockResolvedValue(undefined);
  mocks.from.mockReturnValue({ remove: mocks.remove, exists: mocks.exists });
  mocks.exists.mockResolvedValue({ data: false, error: null });
  mocks.remove.mockResolvedValue({ error: null });
});
afterAll(async () => {
  await database?.close();
});
async function asset(
  owner = merchant,
  path = `${owner}/${crypto.randomUUID()}.png`,
) {
  const id = crypto.randomUUID();
  await database.query(
    "INSERT INTO media_assets(id,merchant_id,path,url,name)VALUES($1,$2,$3,'https://example.test/image.png','image.png')",
    [id, owner, path],
  );
  return { id, path };
}
async function exists(id: string) {
  return (
    (await database.query("SELECT id FROM media_assets WHERE id=$1", [id])).rows
      .length > 0
  );
}
it("removes the tenant's stored object and metadata; repeated deletion is safe", async () => {
  const file = await asset();
  await removeMediaAsset(merchant, file.id);
  expect(mocks.from).toHaveBeenCalledWith("merchant-media");
  expect(mocks.remove).toHaveBeenCalledWith([file.path]);
  expect(await exists(file.id)).toBe(false);
  await removeMediaAsset(merchant, file.id);
  expect(mocks.remove).toHaveBeenCalledOnce();
});
it("retains metadata when storage removal fails", async () => {
  const file = await asset();
  mocks.remove.mockResolvedValue({
    error: { message: "private storage error" },
  });
  await expect(removeMediaAsset(merchant, file.id)).rejects.toThrow(
    "Storage removal failed",
  );
  expect(await exists(file.id)).toBe(true);
});
it("retains metadata if storage reports success but the object still exists", async () => {
  const file = await asset();
  mocks.exists.mockResolvedValue({ data: true, error: null });
  await expect(removeMediaAsset(merchant, file.id)).rejects.toThrow(
    "Storage removal failed",
  );
  expect(await exists(file.id)).toBe(true);
});
it("supports retry after storage succeeds but metadata deletion fails", async () => {
  const file = await asset();
  await database.exec(
    "CREATE FUNCTION reject_media_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$;CREATE TRIGGER reject_media_delete BEFORE DELETE ON media_assets FOR EACH ROW EXECUTE FUNCTION reject_media_delete();",
  );
  try {
    await expect(removeMediaAsset(merchant, file.id)).rejects.toThrow();
    expect(await exists(file.id)).toBe(true);
  } finally {
    await database.exec(
      "DROP TRIGGER reject_media_delete ON media_assets;DROP FUNCTION reject_media_delete();",
    );
  }
  await removeMediaAsset(merchant, file.id);
  expect(await exists(file.id)).toBe(false);
  expect(mocks.remove).toHaveBeenCalledTimes(2);
});
it("cannot delete another business's asset by a known ID or mismatched stored path", async () => {
  const foreign = await asset(other);
  await removeMediaAsset(merchant, foreign.id);
  expect(await exists(foreign.id)).toBe(true);
  expect(mocks.remove).not.toHaveBeenCalled();
  const corrupt = await asset(merchant, `${other}/${crypto.randomUUID()}.png`);
  await expect(removeMediaAsset(merchant, corrupt.id)).rejects.toThrow(
    "Invalid media path",
  );
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("checks permission and subscription before touching storage", async () => {
  const file = await asset();
  mocks.authorize.mockRejectedValueOnce(Error("Business access denied"));
  await expect(removeMediaAsset(merchant, file.id)).rejects.toThrow();
  expect(mocks.db).not.toHaveBeenCalled();
  mocks.subscription.mockRejectedValueOnce(Error("Subscription required:"));
  await expect(removeMediaAsset(merchant, file.id)).rejects.toThrow();
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("counts only this business's orders completed in the Malaysian month, with member count", async () => {
  const start =
    "(date_trunc('month',current_timestamp AT TIME ZONE 'Asia/Kuala_Lumpur') AT TIME ZONE 'Asia/Kuala_Lumpur')";
  let number = 1;
  for (const [owner, status, total, time] of [
    [merchant, "completed", 1234, start],
    [merchant, "completed", 2500, `${start} + interval '1 hour'`],
    [merchant, "pending", 9999, start],
    [merchant, "preparing", 9999, start],
    [merchant, "cancelled", 9999, start],
    [merchant, "completed", 9999, `${start} - interval '1 second'`],
    [
      merchant,
      "completed",
      9999,
      `((date_trunc('month',current_timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')+interval '1 month') AT TIME ZONE 'Asia/Kuala_Lumpur')`,
    ],
    [other, "completed", 9999, start],
  ] as const) {
    await database.query(
      `INSERT INTO pos_orders(merchant_id,number,request_id,fingerprint,status,total,payment,fulfillment,created_by,created_at,updated_at,cancel_reason,cancelled_at)VALUES($1,$2,$3,'test',$4,$5,'unpaid','takeaway',$6,${start}-interval '5 days',${time},CASE WHEN $4='cancelled' THEN 'Test cancellation' ELSE NULL END,CASE WHEN $4='cancelled' THEN current_timestamp ELSE NULL END)`,
      [owner, number++, crypto.randomUUID(), status, total, actor],
    );
  }
  expect(await loadOverviewMetrics(merchant)).toEqual({
    revenue: 3734,
    completedOrders: 2,
    employees: 2,
  });
});
it("returns zero revenue for a new business, and never queries metrics before authorization", async () => {
  const empty = crypto.randomUUID();
  await database.query(
    "INSERT INTO merchants(id,name,slug)VALUES($1,'Empty',$2)",
    [empty, empty],
  );
  expect(await loadOverviewMetrics(empty)).toEqual({
    revenue: 0,
    completedOrders: 0,
    employees: 0,
  });
  mocks.db.mockClear();
  mocks.authorize.mockRejectedValueOnce(Error("Business access denied"));
  await expect(loadOverviewMetrics(merchant)).rejects.toThrow();
  expect(mocks.db).not.toHaveBeenCalled();
});
