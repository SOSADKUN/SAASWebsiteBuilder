// Read-only metadata reconciliation. No release/repair/delete mode exists here.
import "./load-env";
import postgres from "postgres";
import { z } from "zod";
import {
  getDatabaseUrl,
  databaseOptions,
  safeDatabaseError,
} from "../src/lib/database-config";

async function main() {
  const argument = process.argv[2];
  if (argument !== "--summary" && !z.uuid().safeParse(argument).success)
    throw new Error("Use --summary or one merchant UUID");
  const merchant = argument === "--summary" ? null : argument;
  const url = getDatabaseUrl(undefined, true);
  const client = postgres(url, databaseOptions(url, true));
  try {
    const report = await client.begin(
      "isolation level repeatable read read only",
      async (sql) => {
        const records = await sql`SELECT m.id,m.merchant_id,m.path,m.url,
        EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='merchant-media' AND o.name=m.path) AS object_metadata_present
        FROM public.media_assets m WHERE (${merchant}::uuid IS NULL OR m.merchant_id=${merchant}::uuid)`;
        const objects =
          await sql`SELECT o.id,o.name,o.metadata->>'size' AS bytes,
        EXISTS(SELECT 1 FROM public.media_assets m WHERE m.path=o.name AND m.merchant_id::text=split_part(o.name,'/',1)) AS library_record_present
        FROM storage.objects o WHERE o.bucket_id='merchant-media'
        AND (${merchant}::uuid IS NULL OR split_part(o.name,'/',1)=${merchant})`;
        const reservations = await sql`SELECT r.id,r.path,r.bytes,
        EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='merchant-media' AND o.name=r.path) AS object_present
        FROM public.media_upload_reservations r WHERE (${merchant}::uuid IS NULL OR r.merchant_id=${merchant}::uuid)`;
        let quotaSnapshot: unknown;
        try {
          quotaSnapshot = await sql.savepoint(async (tx) => {
            const [row] =
              await tx`SELECT coalesce(sum(s.used_bytes),0)::text AS used_bytes,
              coalesce(sum(s.reserved_bytes),0)::text AS reserved_bytes
              FROM public.merchants m CROSS JOIN LATERAL public.company_storage_snapshot(m.id) s
              WHERE (${merchant}::uuid IS NULL OR m.id=${merchant}::uuid)`;
            return row;
          });
        } catch {
          quotaSnapshot =
            "Unavailable: review unknown sizes or quota configuration; no repair attempted.";
        }
        const invalidPaths = records.filter(
          (r) =>
            !r.path.startsWith(`${r.merchant_id}/`) ||
            r.path.split("/").length !== 2 ||
            r.path.includes(".."),
        );
        const invalidUrls = records.filter((r) => {
          try {
            const actual = new URL(r.url);
            const expected = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
            return (
              actual.origin !== expected.origin ||
              decodeURIComponent(actual.pathname) !==
                `/storage/v1/object/public/merchant-media/${r.path}`
            );
          } catch {
            return true;
          }
        });
        return {
          scope: merchant ? "single merchant" : "all merchants (counts only)",
          libraryRecords: records.length,
          storageObjects: objects.length,
          recordsMissingObjectMetadata: records.filter(
            (r) => !r.object_metadata_present,
          ).length,
          objectsWithoutLibraryRecords: objects.filter(
            (o) => !o.library_record_present,
          ).length,
          invalidPaths: invalidPaths.length,
          urlsNotMatchingConfiguredProjectAndPath: invalidUrls.length,
          unknownSizeObjects: objects.filter(
            (o) => !/^\d+$/.test(o.bytes ?? ""),
          ).length,
          knownObjectBytes: objects.reduce(
            (sum, o) =>
              sum + (/^\d+$/.test(o.bytes ?? "") ? Number(o.bytes) : 0),
            0,
          ),
          reservedBytesForAbsentObjects: reservations
            .filter((r) => !r.object_present)
            .reduce((sum, r) => sum + Number(r.bytes), 0),
          pendingReservations: reservations.filter((r) => !r.object_present)
            .length,
          quotaSnapshot,
          // Identifiers are useful for an approved scoped repair; never print URLs,
          // filenames, credentials, customer content or raw database errors.
          ...(merchant
            ? {
                missingObjectRecordIds: records
                  .filter((r) => !r.object_metadata_present)
                  .map((r) => r.id),
                invalidPathRecordIds: invalidPaths.map((r) => r.id),
                invalidUrlRecordIds: invalidUrls.map((r) => r.id),
                orphanStorageObjectIds: objects
                  .filter((o) => !o.library_record_present)
                  .map((o) => o.id),
                pendingReservationIds: reservations
                  .filter((r) => !r.object_present)
                  .map((r) => r.id),
              }
            : {}),
          limitation:
            "Storage metadata comparison only; it does not prove image bytes exist or verify Vercel environment settings.",
        };
      },
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.end({ timeout: 5 });
  }
}
main().catch((error) => {
  console.error(safeDatabaseError(error));
  process.exitCode = 1;
});
