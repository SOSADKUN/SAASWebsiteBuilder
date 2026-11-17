import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import {
  businessModules,
  moduleAccess,
  type ModuleState,
} from "@/lib/business-modules";

// Internal: callers must validate the merchant membership first.
export async function merchantModuleState(
  merchantId: string,
  database: Pick<ReturnType<typeof db>, "select"> = db(),
): Promise<ModuleState[]> {
  const rows = await database
    .select({
      key: s.merchantModules.moduleKey,
      enabled: s.merchantModules.enabled,
      licenseId: s.moduleEntitlements.id,
      expiresAt: s.moduleEntitlements.expiresAt,
      available: s.moduleDefinitions.available,
      expired: sql<boolean>`${s.moduleEntitlements.expiresAt} IS NOT NULL AND ${s.moduleEntitlements.expiresAt} <= CURRENT_TIMESTAMP`,
    })
    .from(s.merchantModules)
    .innerJoin(
      s.moduleDefinitions,
      eq(s.moduleDefinitions.key, s.merchantModules.moduleKey),
    )
    .leftJoin(
      s.moduleEntitlements,
      and(
        eq(s.moduleEntitlements.merchantId, s.merchantModules.merchantId),
        eq(s.moduleEntitlements.moduleKey, s.merchantModules.moduleKey),
      ),
    )
    .where(eq(s.merchantModules.merchantId, merchantId));
  return rows.map((row) => ({
    key: row.key,
    enabled: row.enabled && row.available,
    entitled: !!row.licenseId,
    expiresAt: row.expired
      ? "1970-01-01T00:00:00.000Z"
      : (row.expiresAt?.toISOString() ?? null),
  }));
}
export async function requireModule(merchantId: string, key: string) {
  if (
    !businessModules.some(
      (m) => m.key === key && m.availability === "implemented",
    ) ||
    moduleAccess(key, await merchantModuleState(merchantId)) !== "enabled"
  )
    throw new Error("Business module is disabled or not entitled");
}
