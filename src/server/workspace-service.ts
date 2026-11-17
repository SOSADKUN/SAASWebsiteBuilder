import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { authorize } from "@/lib/auth";
import { storageAdmin } from "@/lib/storage-admin";
import {
  MediaError,
  missingStorageObject,
  mediaStorageFailure,
} from "@/lib/media-errors";

export async function loadOverviewMetrics(merchantId: string) {
  await authorize(z.uuid().parse(merchantId), "reports:view");
  // A terminal completed order's updated_at is its completion time. Use the
  // business's Malaysian calendar month, including orders created last month.
  const [row] = await db()
    .select({
      revenue: sql<string>`coalesce(sum(${s.orders.total}), 0)::text`,
      recordedCash: sql<string>`coalesce(sum(CASE WHEN ${s.orders.payment} = 'cash' AND ${s.orders.cashReceived} >= ${s.orders.total} THEN ${s.orders.total} ELSE 0 END),0)::text`,
      completedOrders: count(),
      employees: sql<number>`(select count(*)::int from ${s.memberships} where ${s.memberships.merchantId} = ${merchantId})`,
    })
    .from(s.orders)
    .where(
      and(
        eq(s.orders.merchantId, merchantId),
        eq(s.orders.status, "completed"),
        sql`${s.orders.updatedAt} >= (date_trunc('month', current_timestamp AT TIME ZONE 'Asia/Kuala_Lumpur') AT TIME ZONE 'Asia/Kuala_Lumpur')`,
        sql`${s.orders.updatedAt} < ((date_trunc('month', current_timestamp AT TIME ZONE 'Asia/Kuala_Lumpur') + interval '1 month') AT TIME ZONE 'Asia/Kuala_Lumpur')`,
      ),
    );
  return {
    revenue: Number(row.revenue),
    recordedCash: Number(row.recordedCash),
    completedOrders: row.completedOrders,
    employees: Number(row.employees),
  };
}

export async function removeMediaAsset(merchantId: string, assetId: string) {
  await authorize(z.uuid().parse(merchantId), "media:manage");
  z.uuid().parse(assetId);

  const database = db();
  const asset = await database.query.media.findFirst({
    where: and(eq(s.media.id, assetId), eq(s.media.merchantId, merchantId)),
  });
  if (!asset) return;
  // Resolve the object from the tenant's stored record, never a client URL/path.
  if (
    !asset.path.startsWith(`${merchantId}/`) ||
    asset.path.split("/").length !== 2 ||
    asset.path.includes("..")
  )
    throw new MediaError("MEDIA_INVALID_PATH", "Invalid media path");
  const client = storageAdmin();
  const bucket = client.storage.from("merchant-media");
  try {
    const { error } = await bucket.remove([asset.path]);
    // A missing file is recoverable, but permissions/network failures are not
    // evidence of absence. Keep metadata and reservations on those failures.
    if (error && !missingStorageObject(error)) throw mediaStorageFailure(error);
  } catch (error) {
    if (!missingStorageObject(error)) {
      if (!(error instanceof MediaError)) throw mediaStorageFailure(error);
      throw error;
    }
  }
  // A storage policy can filter a remove request without deleting an object.
  // Verify against the authenticated object-info endpoint, not a cached public URL.
  const remaining = await bucket.exists(asset.path).catch((error: unknown) => {
    if (missingStorageObject(error)) return { data: false, error: null };
    throw mediaStorageFailure(error, true);
  });
  // The installed Storage SDK returns an error object for confirmed absence.
  // Do not confuse that expected result with an ambiguous verification failure.
  if (remaining.error && !missingStorageObject(remaining.error))
    throw mediaStorageFailure(remaining.error, true);
  if (remaining.data) throw mediaStorageFailure(null);
  // Storage and SQL cannot share a transaction. Keep the record on storage
  // failure. If SQL fails after removal, retry safely removes the absent object
  // again before clearing the remaining metadata.
  await database.transaction(async (tx) => {
    await tx
      .select({ id: s.merchants.id })
      .from(s.merchants)
      .where(eq(s.merchants.id, merchantId))
      .for("update");
    const result = await tx.execute(
      sql`select name from storage.objects where bucket_id='merchant-media' and name=${asset.path}`,
    );
    const rows = Array.isArray(result)
      ? result
      : (result as { rows: unknown[] }).rows;
    if (rows.length) throw mediaStorageFailure(null);
    // Cancelling under the insert guard's same lock closes late-upload races.
    await tx
      .delete(s.mediaReservations)
      .where(
        and(
          eq(s.mediaReservations.merchantId, merchantId),
          eq(s.mediaReservations.path, asset.path),
        ),
      );
    await tx
      .delete(s.media)
      .where(and(eq(s.media.id, assetId), eq(s.media.merchantId, merchantId)));
  });
}
