import "server-only";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { authorize } from "@/lib/auth";
import { requireSubscription } from "@/lib/subscription-service";
import {
  canChangeOrder,
  createOrderSchema,
  orderChangeSchema,
  OrderError,
  type CreateOrderInput,
  type OperationsSnapshot,
} from "@/lib/order-policy";
import { z } from "zod";
import { workspaceTrace } from "@/lib/workspace-diagnostics";

export async function createPosOrder(
  merchantId: string,
  input: CreateOrderInput,
  trace = workspaceTrace("pos.order.create"),
) {
  const actor = await trace.step("authorization", () =>
    authorize(z.uuid().parse(merchantId), "pos:operate"),
  );
  const value = createOrderSchema.parse(input);
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        ...value,
        items: [...value.items].sort((a, b) =>
          a.productId.localeCompare(b.productId),
        ),
      }),
    )
    .digest("hex");
  await trace.step("subscription", () => requireSubscription(merchantId));
  return trace.step("database_transaction", () =>
    db().transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('statement_timeout','10000',true),set_config('lock_timeout','5000',true)`,
      );
      // The no-op upsert also takes the merchant's row lock and returns its
      // current counter, avoiding a separate INSERT followed by SELECT FOR UPDATE.
      const [counter] = await tx
        .insert(s.orderCounters)
        .values({ merchantId })
        .onConflictDoUpdate({
          target: s.orderCounters.merchantId,
          set: { lastNumber: sql`${s.orderCounters.lastNumber}` },
        })
        .returning();
      const [existing] = await tx
        .select()
        .from(s.orders)
        .where(
          and(
            eq(s.orders.merchantId, merchantId),
            eq(s.orders.requestId, value.requestId),
          ),
        );
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw new OrderError(
            "REQUEST_REUSED",
            "This bill was already submitted with different details. Check the recent orders before starting a new bill.",
          );
        return { orderId: existing.id, number: existing.number };
      }
      const products = await tx
        .select()
        .from(s.products)
        .where(
          and(
            eq(s.products.merchantId, merchantId),
            eq(s.products.available, true),
            inArray(
              s.products.id,
              value.items.map((item) => item.productId),
            ),
          ),
        )
        .for("share");
      if (products.length !== value.items.length)
        throw new OrderError(
          "MENU_CHANGED",
          "A product is unavailable or was removed. Refresh the menu and review your bill.",
        );
      const items = value.items.map((item) => {
        const product = products.find(
          (product) => product.id === item.productId,
        )!;
        if (product.price !== item.expectedPrice)
          throw new OrderError(
            "MENU_CHANGED",
            "A menu price changed. Review the current prices before submitting again.",
          );
        return {
          merchantId,
          productId: product.id,
          name: product.name,
          image: product.image,
          unitPrice: product.price,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
        };
      });
      const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
      if (total > 2000000000)
        throw new OrderError(
          "INVALID_TOTAL",
          "This bill is too large. Split it into smaller orders.",
        );
      const cash =
        value.payment === "cash" ? (value.cashReceived ?? total) : null;
      if (cash !== null && cash < total)
        throw new OrderError(
          "INSUFFICIENT_CASH",
          "Cash received must cover the order total.",
        );
      const number = counter.lastNumber + 1;
      const [order] = await tx
        .insert(s.orders)
        .values({
          merchantId,
          number,
          requestId: value.requestId,
          fingerprint,
          total,
          fulfillment: value.fulfillment,
          tableLabel: value.fulfillment === "dine_in" ? value.tableLabel : "",
          note: value.note,
          payment: value.payment,
          cashReceived: cash,
          changeDue: cash === null ? 0 : cash - total,
          createdBy: actor.id,
        })
        .returning();
      const insertItems = tx
        .insert(s.orderItems)
        .values(items.map((item) => ({ ...item, orderId: order.id })));
      const insertEvent = tx.insert(s.orderEvents).values({
        merchantId,
        orderId: order.id,
        version: 0,
        kind: "created",
        toStatus: "pending",
        actorId: actor.id,
      });
      const updateCounter = tx
        .update(s.orderCounters)
        .set({ lastNumber: number })
        .where(eq(s.orderCounters.merchantId, merchantId));
      // One database round trip; all three writes remain atomic. The merchant
      // counter lock stays held until commit, including for concurrent retries.
      await tx.execute(
        sql`WITH saved_items AS (${insertItems.getSQL()}), saved_event AS (${insertEvent.getSQL()}) ${updateCounter.getSQL()}`,
      );
      return { orderId: order.id, number };
    }),
  );
}

export async function changePosOrder(
  merchantId: string,
  input: z.infer<typeof orderChangeSchema>,
) {
  const value = orderChangeSchema.parse(input);
  const actor = await authorize(
    z.uuid().parse(merchantId),
    value.status === "cancelled" ? "pos:operate" : "orders:manage",
  );
  // Cancelling a mistaken ticket remains possible even if billing has expired.
  if (value.status !== "cancelled") await requireSubscription(merchantId);
  if (value.status === "cancelled" && value.reason.length < 3)
    throw new OrderError(
      "REASON_REQUIRED",
      "Enter a cancellation reason (at least 3 characters).",
    );
  return db().transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(s.orders)
      .where(
        and(
          eq(s.orders.merchantId, merchantId),
          eq(s.orders.id, value.orderId),
        ),
      )
      .for("update");
    if (!order)
      throw new OrderError("NOT_FOUND", "Order not found for this business.");
    if (order.version !== value.version)
      throw new OrderError(
        "CONFLICT",
        "This order changed on another device. Review the current status and try again.",
      );
    if (!canChangeOrder(order.status, value.status))
      throw new OrderError(
        "INVALID_TRANSITION",
        "This status change is no longer available. Only pending orders can be cancelled; completed or cancelled orders cannot be reopened.",
      );
    const [updated] = await tx
      .update(s.orders)
      .set({
        status: value.status,
        version: order.version + 1,
        updatedAt: new Date(),
        ...(value.status === "cancelled"
          ? { cancelReason: value.reason, cancelledAt: new Date() }
          : {}),
      })
      .where(
        and(
          eq(s.orders.merchantId, merchantId),
          eq(s.orders.id, value.orderId),
          eq(s.orders.version, value.version),
        ),
      )
      .returning();
    if (!updated)
      throw new OrderError(
        "CONFLICT",
        "This order changed on another device. Refresh and try again.",
      );
    await tx.insert(s.orderEvents).values({
      merchantId,
      orderId: order.id,
      version: updated.version,
      kind: value.status === "cancelled" ? "cancelled" : "status_changed",
      fromStatus: order.status,
      toStatus: value.status,
      reason: value.status === "cancelled" ? value.reason : "",
      actorId: actor.id,
    });
    return { orderId: order.id, number: order.number };
  });
}
export async function acknowledgePosCancellation(
  merchantId: string,
  input: { orderId: string; version: number },
) {
  const value = orderChangeSchema
    .pick({ orderId: true, version: true })
    .parse(input);
  const actor = await authorize(z.uuid().parse(merchantId), "orders:manage");
  return db().transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(s.orders)
      .where(
        and(
          eq(s.orders.merchantId, merchantId),
          eq(s.orders.id, value.orderId),
        ),
      )
      .for("update");
    if (!order)
      throw new OrderError("NOT_FOUND", "Order not found for this business.");
    if (order.status !== "cancelled")
      throw new OrderError(
        "INVALID_TRANSITION",
        "Only cancelled orders can be acknowledged.",
      );
    if (order.cancellationAcknowledgedAt)
      return { orderId: order.id, number: order.number };
    if (order.version !== value.version)
      throw new OrderError(
        "CONFLICT",
        "This ticket changed. Refresh and try again.",
      );
    const [updated] = await tx
      .update(s.orders)
      .set({
        version: order.version + 1,
        updatedAt: new Date(),
        cancellationAcknowledgedAt: new Date(),
        cancellationAcknowledgedBy: actor.id,
      })
      .where(
        and(
          eq(s.orders.merchantId, merchantId),
          eq(s.orders.id, order.id),
          eq(s.orders.version, value.version),
        ),
      )
      .returning();
    if (!updated)
      throw new OrderError(
        "CONFLICT",
        "This ticket changed. Refresh and try again.",
      );
    await tx.insert(s.orderEvents).values({
      merchantId,
      orderId: order.id,
      version: updated.version,
      kind: "cancellation_acknowledged",
      fromStatus: "cancelled",
      toStatus: "cancelled",
      reason: "Kitchen acknowledged cancellation",
      actorId: actor.id,
    });
    return { orderId: order.id, number: order.number };
  });
}

export async function operationsSnapshot(
  merchantId: string,
  withMenu = false,
): Promise<OperationsSnapshot> {
  await authorize(
    z.uuid().parse(merchantId),
    withMenu ? "pos:operate" : "orders:manage",
  );
  const database = db();
  const active = or(
    inArray(s.orders.status, ["pending", "preparing", "ready"]),
    and(
      eq(s.orders.status, "cancelled"),
      isNull(s.orders.cancellationAcknowledgedAt),
    ),
  )!;
  const [queue, history] = await Promise.all([
    database
      .select()
      .from(s.orders)
      .where(and(eq(s.orders.merchantId, merchantId), active))
      .orderBy(asc(s.orders.createdAt)),
    database
      .select()
      .from(s.orders)
      .where(and(eq(s.orders.merchantId, merchantId), sql`NOT (${active})`))
      .orderBy(desc(s.orders.updatedAt))
      .limit(50),
  ]);
  const rows = [...queue, ...history],
    ids = rows.map((row) => row.id);
  const [items, events] = ids.length
    ? await Promise.all([
        database
          .select()
          .from(s.orderItems)
          .where(
            and(
              eq(s.orderItems.merchantId, merchantId),
              inArray(s.orderItems.orderId, ids),
            ),
          ),
        database
          .select()
          .from(s.orderEvents)
          .where(
            and(
              eq(s.orderEvents.merchantId, merchantId),
              inArray(s.orderEvents.orderId, ids),
            ),
          )
          .orderBy(asc(s.orderEvents.version)),
      ])
    : [[], []];
  const result: OperationsSnapshot = {
    orders: rows.map((row) => ({
      id: row.id,
      number: row.number,
      requestId: row.requestId,
      status: row.status,
      version: row.version,
      fulfillment: row.fulfillment,
      tableLabel: row.tableLabel,
      note: row.note,
      total: row.total,
      payment: row.payment,
      cashReceived: row.cashReceived,
      changeDue: row.changeDue,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      cancelReason: row.cancelReason,
      cancellationAcknowledgedAt:
        row.cancellationAcknowledgedAt?.toISOString() ?? null,
      items: items
        .filter((item) => item.orderId === row.id)
        .map((item) => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          image: item.image,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
      // Ignore an event newer than the header read if another device just changed
      // the ticket. The next poll brings both forward; writes still check version.
      events: events
        .filter(
          (event) => event.orderId === row.id && event.version <= row.version,
        )
        .map((event) => ({
          id: event.id,
          version: event.version,
          kind: event.kind,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          reason: event.reason,
          createdAt: event.createdAt.toISOString(),
        })),
    })),
  };
  if (withMenu) {
    const [products, categories] = await Promise.all([
      database
        .select()
        .from(s.products)
        .where(eq(s.products.merchantId, merchantId))
        .orderBy(asc(s.products.position)),
      database
        .select()
        .from(s.categories)
        .where(eq(s.categories.merchantId, merchantId))
        .orderBy(asc(s.categories.position)),
    ]);
    result.products = products.map(
      ({
        id,
        categoryId,
        name,
        description,
        price,
        image,
        available,
        position,
      }) => ({
        id,
        categoryId,
        name,
        description,
        price,
        image,
        available,
        position,
      }),
    );
    result.categories = categories.map(({ id, name, position }) => ({
      id,
      name,
      position,
    }));
  }
  return result;
}
