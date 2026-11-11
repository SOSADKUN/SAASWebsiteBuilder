import "./load-env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { definitions, settingsSchema } from "../src/lib/models";
import * as s from "../src/db/schema";
import { z } from "zod";
import {
  getDatabaseUrl,
  databaseOptions,
  safeDatabaseError,
} from "../src/lib/database-config";
export async function registerCatalog(database: ReturnType<typeof drizzle>) {
  await database.transaction(async (tx) => {
    for (const definition of definitions) {
      await tx
        .insert(s.componentDefinitions)
        .values({
          key: definition.key,
          name: definition.name,
          category: definition.type,
          premium: definition.premium,
        })
        .onConflictDoNothing();
      for (const version of definition.versions)
        await tx
          .insert(s.componentVersions)
          .values({
            componentKey: definition.key,
            version,
            schema: z.toJSONSchema(settingsSchema),
          })
          .onConflictDoNothing();
      await tx
        .insert(s.storeProducts)
        .values({ componentKey: definition.key, price: definition.price * 100 })
        .onConflictDoNothing();
    }
  });
}
async function main() {
  const connectionUrl = getDatabaseUrl(undefined, true);
  const client = postgres(connectionUrl, databaseOptions(connectionUrl, true));
  try {
    await registerCatalog(drizzle(client));
    console.log(
      "Design catalog registered. Existing listings, prices, entitlements and page layouts were preserved.",
    );
  } finally {
    await client.end();
  }
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/catalog.ts"))
  main().catch((e) => {
    console.error(safeDatabaseError(e));
    process.exitCode = 1;
  });
