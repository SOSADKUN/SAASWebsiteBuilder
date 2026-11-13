import "./load-env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { databaseOptions, getDatabaseUrl } from "../src/lib/database-config";
import { workspaceTrace } from "../src/lib/workspace-diagnostics";

// Only SELECT queries, using a synthetic tenant/user rather than a customer's
// account. Query results are discarded; no IDs, content or credentials are logged.
const probeId = "00000000-0000-4000-8000-000000000000";

async function probe(mode: "configured" | "pipelined" | "non_pipelined") {
  const url = getDatabaseUrl();
  const options = databaseOptions(url);
  const client = postgres(url, {
    ...options,
    ...(mode === "configured"
      ? {}
      : { max_pipeline: mode === "pipelined" ? 100 : 1 }),
  });
  const database = drizzle(client, { schema });
  let failed = false;
  try {
    for (let round = 1; round <= 2; round++) {
      const trace = workspaceTrace(`dashboard.probe.${mode}`);
      console.info(
        JSON.stringify({
          check: "dashboard_probe",
          mode,
          round,
          reference: trace.reference,
        }),
      );
      await trace.step("membership", () =>
        database.query.memberships.findFirst({
          where: eq(schema.memberships.userId, probeId),
        }),
      );
      const reads = [
        () =>
          trace.step("business", () =>
            database.query.merchants.findFirst({
              where: eq(schema.merchants.id, probeId),
            }),
          ),
        () =>
          trace.step("pages", () =>
            database
              .select()
              .from(schema.pages)
              .where(eq(schema.pages.merchantId, probeId))
              .orderBy(asc(schema.pages.updatedAt)),
          ),
        () =>
          trace.step("products", () =>
            database
              .select()
              .from(schema.products)
              .where(eq(schema.products.merchantId, probeId))
              .orderBy(asc(schema.products.position)),
          ),
        () =>
          trace.step("categories", () =>
            database
              .select()
              .from(schema.categories)
              .where(eq(schema.categories.merchantId, probeId))
              .orderBy(asc(schema.categories.position)),
          ),
        () =>
          trace.step("entitlements", () =>
            database
              .select()
              .from(schema.entitlements)
              .where(eq(schema.entitlements.merchantId, probeId)),
          ),
        () =>
          trace.step("media", () =>
            database
              .select()
              .from(schema.media)
              .where(eq(schema.media.merchantId, probeId)),
          ),
        () =>
          trace.step("catalog", () =>
            database.select().from(schema.componentDefinitions),
          ),
        () =>
          trace.step("prices", () =>
            database.select().from(schema.storeProducts),
          ),
      ];
      // Keep the diagnostic process alive until every stage settles, even when
      // one fails. This is a CLI probe, not a Dashboard authorization bypass.
      const results = await Promise.allSettled(reads.map((read) => read()));
      const failures = results.filter(
        (result) => result.status === "rejected",
      ).length;
      console.info(
        JSON.stringify({
          check: "dashboard_probe_result",
          mode,
          round,
          reference: trace.reference,
          failures,
        }),
      );
      if (failures) {
        failed = true;
        break;
      }
      await trace.step("read_only_transaction", () =>
        client.begin("read only", async (sql) => {
          await sql`SELECT 1`;
          await sql`SELECT 2`;
        }),
      );
    }
  } catch (error) {
    workspaceTrace(`dashboard.probe.${mode}`).fail(error);
    failed = true;
  } finally {
    await client.end({ timeout: 5 });
  }
  return failed;
}

async function main() {
  console.info(
    "Read-only synthetic Dashboard queries from this machine, not Vercel. No customer content or credentials are printed.",
  );
  if (process.argv.includes("--compare-pipelining")) {
    const pipelinedFailed = await probe("pipelined");
    const nonPipelinedFailed = await probe("non_pipelined");
    console.info(
      JSON.stringify({
        check: "pipelining_comparison",
        pipelinedFailed,
        nonPipelinedFailed,
      }),
    );
    if (nonPipelinedFailed) process.exitCode = 1;
  } else if (await probe("configured")) process.exitCode = 1;
}

main().catch(() => {
  console.error(
    "Dashboard diagnostics could not start. Check configuration without sharing credentials.",
  );
  process.exitCode = 1;
});
