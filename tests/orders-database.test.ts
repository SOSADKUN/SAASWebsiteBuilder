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
const mocks = vi.hoisted(() => ({ db: vi.fn(), authorize: vi.fn() }));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({ authorize: mocks.authorize }));
import * as schema from "../src/db/schema";
import {
  createPosOrder,
  changePosOrder,
  acknowledgePosCancellation,
  operationsSnapshot,
} from "../src/server/order-service";
import type { CreateOrderInput } from "../src/lib/order-policy";
let database: PGlite;
const merchant = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  category = "33333333-3333-4333-8333-333333333333",
  product = "44444444-4444-4444-8444-444444444444",
  actor = "55555555-5555-4555-8555-555555555555",
  otherProduct = "66666666-6666-4666-8666-666666666666",
  expired = "77777777-7777-4777-8777-777777777777";
function input(overrides: Partial<CreateOrderInput> = {}): CreateOrderInput {
  return {
    requestId: crypto.randomUUID(),
    items: [{ productId: product, quantity: 2, expectedPrice: 1200 }],
    fulfillment: "dine_in",
    tableLabel: "04",
    note: "No sugar",
    payment: "cash",
    cashReceived: 3000,
    ...overrides,
  };
}
beforeAll(async () => {
  database = new PGlite();
  await database.exec(
    "CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;",
  );
  for (const file of (await readdir("drizzle"))
    .filter((file) => file.endsWith(".sql"))
    .sort())
    await database.exec(await readFile(`drizzle/${file}`, "utf8"));
  await database.query(
    "INSERT INTO merchants(id,name,slug) VALUES ($1,'A','pos-a'),($2,'B','pos-b')",
    [merchant, other],
  );
  await database.query(
    "INSERT INTO merchants(id,name,slug,trial_started_at,trial_ends_at) VALUES ($1,'Expired','pos-expired','2000-01-01','2000-01-15')",
    [expired],
  );
  await database.query(
    "INSERT INTO menu_categories(id,merchant_id,name) VALUES ($1,$2,'Coffee'),($3,$4,'Other')",
    [category, merchant, other, other],
  );
  await database.query(
    "INSERT INTO menu_products(id,merchant_id,category_id,name,description,price) VALUES ($1,$2,$3,'Latte','',1200),($4,$5,$5,'Other private item','',100)",
    [product, merchant, category, otherProduct, other],
  );
}, 60000);
beforeEach(async () => {
  vi.clearAllMocks();
  mocks.db.mockReturnValue(drizzle(database, { schema }));
  mocks.authorize.mockImplementation(async (id: string) => {
    if (id === other) throw Error("Business access denied");
    return { id: actor };
  });
  await database.query(
    "UPDATE menu_products SET price=1200,available=true,name='Latte' WHERE id=$1",
    [product],
  );
});
afterAll(async () => {
  await database?.close();
});
describe("durable POS orders", () => {
  it("keeps an immediate cancellation visible even before the kitchen has ever polled", async () => {
    const order = await createPosOrder(merchant, input());
    await changePosOrder(merchant, {
      orderId: order.orderId,
      version: 0,
      status: "cancelled",
      reason: "Accidental duplicate",
    });
    const firstKitchenSnapshot = await operationsSnapshot(merchant);
    expect(
      firstKitchenSnapshot.orders.find((ticket) => ticket.id === order.orderId),
    ).toMatchObject({
      status: "cancelled",
      cancelReason: "Accidental duplicate",
      cancellationAcknowledgedAt: null,
    });
  });
  it("atomically creates priced item snapshots, cash change, a pending ticket and its history", async () => {
    const request = input();
    const result = await createPosOrder(merchant, request);
    const snapshot = await operationsSnapshot(merchant, true);
    const order = snapshot.orders.find((order) => order.id === result.orderId)!;
    expect(order).toMatchObject({
      status: "pending",
      version: 0,
      total: 2400,
      cashReceived: 3000,
      changeDue: 600,
      tableLabel: "04",
      note: "No sugar",
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      name: "Latte",
      quantity: 2,
      unitPrice: 1200,
      lineTotal: 2400,
    });
    expect(order.events).toHaveLength(1);
    expect(order.events[0].kind).toBe("created");
    expect(JSON.stringify(order)).not.toContain("fingerprint");
    expect(JSON.stringify(order)).not.toContain(actor);
    expect(snapshot.products?.some((item) => item.id === otherProduct)).toBe(
      false,
    );
  });
  it("turns concurrent retries of the same request into exactly one ticket", async () => {
    const request = input();
    const results = await Promise.all([
      createPosOrder(merchant, request),
      createPosOrder(merchant, request),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(
      (
        await database.query("SELECT id FROM pos_orders WHERE request_id=$1", [
          request.requestId,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await database.query(
          "SELECT id FROM pos_order_events WHERE order_id=$1",
          [results[0].orderId],
        )
      ).rows,
    ).toHaveLength(1);
    const next = await createPosOrder(merchant, input());
    expect(next.number).toBe(results[0].number + 1);
  });
  it("rejects a changed bill using an already submitted request ID", async () => {
    const request = input();
    await createPosOrder(merchant, request);
    await expect(
      createPosOrder(merchant, { ...request, note: "Different" }),
    ).rejects.toMatchObject({ code: "REQUEST_REUSED" });
  });
  it("rejects another tenant's products without creating a ticket", async () => {
    const request = input({
      items: [{ productId: otherProduct, quantity: 1, expectedPrice: 100 }],
    });
    await expect(createPosOrder(merchant, request)).rejects.toMatchObject({
      code: "MENU_CHANGED",
    });
    expect(
      (
        await database.query("SELECT id FROM pos_orders WHERE request_id=$1", [
          request.requestId,
        ])
      ).rows,
    ).toHaveLength(0);
  });
  it("checks price changes, availability and sufficient cash on the server", async () => {
    await expect(
      createPosOrder(
        merchant,
        input({
          items: [{ productId: product, quantity: 2, expectedPrice: 1 }],
        }),
      ),
    ).rejects.toMatchObject({ code: "MENU_CHANGED" });
    await expect(
      createPosOrder(merchant, input({ cashReceived: 100 })),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_CASH" });
    await database.query(
      "UPDATE menu_products SET available=false WHERE id=$1",
      [product],
    );
    await expect(createPosOrder(merchant, input())).rejects.toMatchObject({
      code: "MENU_CHANGED",
    });
  });
  it("blocks unauthorized access before touching the repository", async () => {
    await expect(createPosOrder(other, input())).rejects.toThrow(
      "access denied",
    );
    expect(mocks.db).not.toHaveBeenCalled();
    await expect(operationsSnapshot(other)).rejects.toThrow("access denied");
  });
  it("scopes order changes to the merchant even when the order ID is known", async () => {
    mocks.authorize.mockResolvedValueOnce({ id: actor });
    const order = await createPosOrder(
      other,
      input({
        items: [{ productId: otherProduct, quantity: 1, expectedPrice: 100 }],
      }),
    );
    await expect(
      changePosOrder(merchant, {
        orderId: order.orderId,
        version: 0,
        status: "cancelled",
        reason: "Wrong business",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(
      (await operationsSnapshot(merchant)).orders.some(
        (ticket) => ticket.id === order.orderId,
      ),
    ).toBe(false);
  });
  it("retains subscription enforcement for new orders", async () => {
    await expect(createPosOrder(expired, input())).rejects.toThrow(
      "Subscription required",
    );
    expect(
      (
        await database.query("SELECT id FROM pos_orders WHERE merchant_id=$1", [
          expired,
        ])
      ).rows,
    ).toHaveLength(0);
  });
  it("rejects a stale kitchen/cashier action and retains the cancellation until acknowledgement", async () => {
    const order = await createPosOrder(merchant, input());
    await changePosOrder(merchant, {
      orderId: order.orderId,
      version: 0,
      status: "preparing",
      reason: "",
    });
    await expect(
      changePosOrder(merchant, {
        orderId: order.orderId,
        version: 0,
        status: "cancelled",
        reason: "Duplicate order",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    for (const status of ["preparing", "ready"] as const) {
      await expect(
        changePosOrder(merchant, {
          orderId: order.orderId,
          version: status === "preparing" ? 1 : 2,
          status: "cancelled",
          reason: "Too late to cancel",
        }),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
      if (status === "preparing")
        await changePosOrder(merchant, {
          orderId: order.orderId,
          version: 1,
          status: "ready",
          reason: "",
        });
    }
    const cancelled = await createPosOrder(merchant, input());
    await changePosOrder(merchant, {
      orderId: cancelled.orderId,
      version: 0,
      status: "cancelled",
      reason: "Customer cancelled",
    });
    await expect(
      changePosOrder(merchant, {
        orderId: cancelled.orderId,
        version: 0,
        status: "preparing",
        reason: "",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    let ticket = (await operationsSnapshot(merchant)).orders.find(
      (item) => item.id === cancelled.orderId,
    )!;
    expect(ticket).toMatchObject({
      status: "cancelled",
      cancelReason: "Customer cancelled",
      cancellationAcknowledgedAt: null,
      version: 1,
    });
    await acknowledgePosCancellation(merchant, {
      orderId: cancelled.orderId,
      version: 1,
    });
    await acknowledgePosCancellation(merchant, {
      orderId: cancelled.orderId,
      version: 1,
    });
    ticket = (await operationsSnapshot(merchant)).orders.find(
      (item) => item.id === cancelled.orderId,
    )!;
    expect(ticket.cancellationAcknowledgedAt).toBeTruthy();
    expect(ticket.version).toBe(2);
    expect(ticket.events.map((item) => item.kind)).toEqual([
      "created",
      "cancelled",
      "cancellation_acknowledged",
    ]);
  });
  it("requires a cancellation reason and enforces the complete lifecycle", async () => {
    const order = await createPosOrder(
      merchant,
      input({
        payment: "unpaid",
        cashReceived: undefined,
        fulfillment: "takeaway",
        tableLabel: "ignored",
      }),
    );
    await expect(
      changePosOrder(merchant, {
        orderId: order.orderId,
        version: 0,
        status: "cancelled",
        reason: "",
      }),
    ).rejects.toMatchObject({ code: "REASON_REQUIRED" });
    await expect(
      changePosOrder(merchant, {
        orderId: order.orderId,
        version: 0,
        status: "completed",
        reason: "",
      }),
    ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    for (const [version, status] of (
      ["preparing", "ready", "completed"] as const
    ).entries())
      await changePosOrder(merchant, {
        orderId: order.orderId,
        version,
        status,
        reason: "",
      });
    await expect(
      changePosOrder(merchant, {
        orderId: order.orderId,
        version: 3,
        status: "cancelled",
        reason: "Too late",
      }),
    ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    const ticket = (await operationsSnapshot(merchant)).orders.find(
      (item) => item.id === order.orderId,
    )!;
    expect(ticket).toMatchObject({
      status: "completed",
      cashReceived: null,
      changeDue: 0,
      tableLabel: "",
    });
  });
  it("preserves item snapshots after a product is renamed or deleted", async () => {
    const temp = crypto.randomUUID();
    await database.query(
      "INSERT INTO menu_products(id,merchant_id,category_id,name,description,price) VALUES ($1,$2,$3,'Historical pastry','',550)",
      [temp, merchant, category],
    );
    const order = await createPosOrder(
      merchant,
      input({ items: [{ productId: temp, quantity: 1, expectedPrice: 550 }] }),
    );
    await database.query("DELETE FROM menu_products WHERE id=$1", [temp]);
    const ticket = (await operationsSnapshot(merchant)).orders.find(
      (item) => item.id === order.orderId,
    )!;
    expect(ticket.items[0]).toMatchObject({
      name: "Historical pastry",
      unitPrice: 550,
      lineTotal: 550,
    });
  });
  it("rolls the whole order back if an audit write fails", async () => {
    const request = input();
    const before = await database.query(
      "SELECT last_number FROM pos_order_counters WHERE merchant_id=$1",
      [merchant],
    );
    await database.exec(
      "CREATE FUNCTION test_reject_pos_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$; CREATE TRIGGER test_reject_pos_event BEFORE INSERT ON pos_order_events FOR EACH ROW EXECUTE FUNCTION test_reject_pos_event();",
    );
    try {
      await expect(createPosOrder(merchant, request)).rejects.toThrow();
      expect(
        (
          await database.query(
            "SELECT id FROM pos_orders WHERE request_id=$1",
            [request.requestId],
          )
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await database.query(
            "SELECT last_number FROM pos_order_counters WHERE merchant_id=$1",
            [merchant],
          )
        ).rows,
      ).toEqual(before.rows);
    } finally {
      await database.exec(
        "DROP TRIGGER test_reject_pos_event ON pos_order_events;DROP FUNCTION test_reject_pos_event();",
      );
    }
  });
});
