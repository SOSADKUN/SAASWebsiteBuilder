// Default is a metadata-only report. --release UUID cancels one pending upload
// after authoritative absence checks. Never deletes an image or Storage row.
import "./load-env";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import {
  getDatabaseUrl,
  databaseOptions,
  safeDatabaseError,
} from "../src/lib/database-config";
import { z } from "zod";
async function main() {
  const mid = z.uuid().parse(process.argv[2]);
  const url = getDatabaseUrl(undefined, true);
  const sql = postgres(url, databaseOptions(url, true));
  try {
    const counts = await sql`select
    (select count(*) from storage.objects o where o.bucket_id='merchant-media' and split_part(o.name,'/',1)=${mid} and (o.metadata->>'size' is null or o.metadata->>'size' !~ '^[0-9]+$')) as unknown_size_objects,
    (select count(*) from storage.objects o where o.bucket_id='merchant-media' and split_part(o.name,'/',1)=${mid} and not exists(select 1 from media_assets m where m.path=o.name)) as objects_without_library_records,
    (select count(*) from media_assets m where m.merchant_id=${mid}::uuid and not exists(select 1 from storage.objects o where o.bucket_id='merchant-media' and o.name=m.path)) as missing_objects,
    (select count(*) from media_upload_reservations r where r.merchant_id=${mid}::uuid and not exists(select 1 from storage.objects o where o.bucket_id='merchant-media' and o.name=r.path)) as pending_reservations`;
    let usage: unknown = null;
    try {
      usage = (
        await sql`select * from public.company_storage_snapshot(${mid}::uuid)`
      )[0];
    } catch {
      usage =
        "Unavailable: resolve missing sizes or database configuration before uploading.";
    }
    console.log({ usage, reconciliation: counts[0] });
    if (process.argv[3] === "--release") {
      const id = z.uuid().parse(process.argv[4]);
      const [row] =
        await sql`select path from media_upload_reservations where id=${id}::uuid and merchant_id=${mid}::uuid`;
      if (!row) throw Error("Pending reservation not found");
      const key = process.env.SUPABASE_STORAGE_SERVICE_KEY;
      if (!key) throw Error("Server Storage credential required");
      const bucket = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
        auth: { persistSession: false },
      }).storage.from("merchant-media");
      const result = await bucket.exists(row.path);
      const e = result.error as { code?: string; status?: number } | null;
      if (
        result.data ||
        (e && e.code !== "NoSuchKey" && !(e.status === 404 && !e.code))
      )
        throw Error("Object absence could not be verified");
      await sql.begin(async (tx) => {
        await tx`select id from merchants where id=${mid}::uuid for update`;
        const objects =
          await tx`select name from storage.objects where bucket_id='merchant-media' and name=${row.path}`;
        if (objects.length) throw Error("Object exists; reservation retained");
        await tx`delete from media_upload_reservations where id=${id}::uuid and merchant_id=${mid}::uuid`;
      });
      console.log("Absent upload reservation released. No image was deleted.");
    }
  } finally {
    await sql.end();
  }
}
main().catch((e) => {
  console.error(safeDatabaseError(e));
  process.exitCode = 1;
});
