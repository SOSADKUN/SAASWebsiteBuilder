import "server-only";
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { storageAdmin } from "@/lib/storage-admin";

function resultRows(value: unknown): Record<string, string>[] {
  return Array.isArray(value)
    ? value
    : (value as { rows: Record<string, string>[] }).rows;
}
export async function storageSnapshot(merchantId: string) {
  const rows = await db().execute(
    sql`select * from public.company_storage_snapshot(${merchantId}::uuid)`,
  );
  const row = resultRows(rows)[0] as {
    used_bytes: string;
    reserved_bytes: string;
    limit_bytes: string;
  };
  return {
    used: Number(row.used_bytes),
    reserved: Number(row.reserved_bytes),
    limit: Number(row.limit_bytes),
  };
}
export async function storeValidatedImage(
  merchantId: string,
  id: string,
  bytes: Uint8Array,
  extension: string,
  mime: string,
  name: string,
) {
  const hash = createHash("sha256").update(bytes).digest("hex");
  const path = `${merchantId}/${id}.${extension}`;
  const bucket = storageAdmin().storage.from("merchant-media");
  // Reserve capacity under the same tenant row lock in every process. No network
  // request is held inside the SQL transaction. Uncertain failures retain capacity.
  await db().transaction(async (tx) => {
    await tx
      .select({ id: s.merchants.id })
      .from(s.merchants)
      .where(eq(s.merchants.id, merchantId))
      .for("update");
    const [existing] = await tx
      .select()
      .from(s.mediaReservations)
      .where(eq(s.mediaReservations.id, id));
    if (existing) {
      if (
        existing.merchantId !== merchantId ||
        existing.hash !== hash ||
        existing.path !== path
      )
        throw new Error("Upload retry does not match");
      return;
    }
    const rows = await tx.execute(
      sql`select * from public.company_storage_snapshot(${merchantId}::uuid)`,
    );
    const usage = resultRows(rows)[0] as {
      used_bytes: string;
      reserved_bytes: string;
      limit_bytes: string;
    };
    if (
      Number(usage.used_bytes) + Number(usage.reserved_bytes) + bytes.length >
      Number(usage.limit_bytes)
    )
      throw new Error(
        "Company storage quota exceeded. Delete unused images before uploading.",
      );
    await tx
      .insert(s.mediaReservations)
      .values({ id, merchantId, path, bytes: bytes.length, hash });
  });
  const stored = await db().query.media.findFirst({
    where: and(eq(s.media.merchantId, merchantId), eq(s.media.path, path)),
  });
  if (stored) return stored.url;
  const result = await bucket.upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });
  // A retry after an uncertain response can encounter an already-created object.
  if (result.error) {
    const info = await bucket.info(path);
    if (info.error || info.data?.size !== bytes.length)
      throw new Error(
        "Upload could not be confirmed. Retry the same image; capacity is reserved.",
      );
    const downloaded = await bucket.download(path);
    if (
      downloaded.error ||
      !downloaded.data ||
      createHash("sha256")
        .update(new Uint8Array(await downloaded.data.arrayBuffer()))
        .digest("hex") !== hash
    )
      throw new Error("Upload retry does not match");
  }
  const url = bucket.getPublicUrl(path).data.publicUrl;
  await db()
    .insert(s.media)
    .values({ merchantId, path, url, name: name.slice(0, 150) })
    .onConflictDoNothing();
  // Keep the reservation as an idempotency tombstone. Snapshot counts it only
  // when its object is absent. Delete releases it after confirmed storage removal.
  return url;
}
