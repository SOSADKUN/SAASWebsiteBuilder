import { config } from "dotenv";
config({ path: ".env.local" });
config();
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { definitions, settingsSchema } from "../src/lib/models";
import * as s from "../src/db/schema";
import { z } from "zod";
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
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
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
    console.error(e instanceof Error ? e.message : "Catalog update failed");
    process.exitCode = 1;
  });
