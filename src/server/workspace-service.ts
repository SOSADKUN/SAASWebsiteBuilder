import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { authorize, supabase } from "@/lib/auth";
import { requireSubscription } from "@/lib/subscription-service";

export async function loadOverviewMetrics(merchantId: string) {
  await authorize(z.uuid().parse(merchantId), "workspace:view");
  // A terminal completed order's updated_at is its completion time. Use the
  // business's Malaysian calendar month, including orders created last month.
  const [row] = await db()
    .select({
      revenue: sql<string>`coalesce(sum(${s.orders.total}), 0)::text`,
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
    completedOrders: row.completedOrders,
    employees: Number(row.employees),
  };
}

export async function removeMediaAsset(merchantId: string, assetId: string) {
  await authorize(z.uuid().parse(merchantId), "website:manage");
  z.uuid().parse(assetId);
  await requireSubscription(merchantId);
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
    throw new Error("Invalid media path");
  const client = await supabase();
  const bucket = client.storage.from("merchant-media");
  const { error } = await bucket.remove([asset.path]);
  if (error) throw new Error("Storage removal failed");
  // A storage policy can filter a remove request without deleting an object.
  // Verify against the authenticated object-info endpoint, not a cached public URL.
  const remaining = await bucket.exists(asset.path);
  if (remaining.data) throw new Error("Storage removal failed");
  // Storage and SQL cannot share a transaction. Keep the record on storage
  // failure. If SQL fails after removal, retry safely removes the absent object
  // again before clearing the remaining metadata.
  await database
    .delete(s.media)
    .where(and(eq(s.media.id, assetId), eq(s.media.merchantId, merchantId)));
}
