import "./scripts/load-env";
import { getDatabaseUrl } from "./src/lib/database-config";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: getDatabaseUrl(undefined, true) },
});
