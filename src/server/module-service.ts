import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import {
  businessModules,
  moduleAccess,
  moduleReadable,
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
      policy: s.moduleDefinitions.accessPolicy,
      trialEligible: s.moduleDefinitions.trialEligible,
      trialEnd: s.moduleTrials.endsAt,
      trialActive: sql<boolean>`${s.moduleTrials.startsAt} <= CURRENT_TIMESTAMP AND ${s.moduleTrials.endsAt} > CURRENT_TIMESTAMP AND ${s.moduleTrials.startsAt} = ${s.merchants.trialStartedAt} AND ${s.moduleTrials.endsAt} = ${s.merchants.trialEndsAt}`,
      verified: sql<boolean>`${s.moduleEntitlements.source} IN ('provider','admin') AND ${s.moduleEntitlements.verifiedAt} <= CURRENT_TIMESTAMP AND ${s.moduleEntitlements.expiresAt} > CURRENT_TIMESTAMP`,
      enabled: s.merchantModules.enabled,
      expiresAt: s.moduleEntitlements.expiresAt,
      available: s.moduleDefinitions.available,
    })
    .from(s.merchantModules)
    .innerJoin(
      s.moduleDefinitions,
      eq(s.moduleDefinitions.key, s.merchantModules.moduleKey),
    )
    .innerJoin(s.merchants, eq(s.merchants.id, s.merchantModules.merchantId))
    .leftJoin(
      s.moduleTrials,
      and(
        eq(s.moduleTrials.merchantId, s.merchantModules.merchantId),
        eq(s.moduleTrials.moduleKey, s.merchantModules.moduleKey),
      ),
    )
    .leftJoin(
      s.moduleEntitlements,
      and(
        eq(s.moduleEntitlements.merchantId, s.merchantModules.merchantId),
        eq(s.moduleEntitlements.moduleKey, s.merchantModules.moduleKey),
      ),
    )
    .where(eq(s.merchantModules.merchantId, merchantId));
  return rows.map((row) => {
    const definition = businessModules.find((m) => m.key === row.key);
    const free = definition?.accessPolicy === "free" && row.policy === "free";
    const paid = definition?.accessPolicy === "paid" && row.policy === "paid";
    const trial =
      paid &&
      definition.trialEligible &&
      row.trialEligible &&
      !!row.trialActive;
    const verified = paid && !!row.verified;
    const useVerified =
      verified &&
      (!trial || row.expiresAt!.getTime() >= row.trialEnd!.getTime());
    return {
      key: row.key,
      available: row.available,
      enabled: row.enabled && row.available,
      entitled: free || trial || verified,
      expiresAt: free
        ? null
        : useVerified
          ? row.expiresAt!.toISOString()
          : (row.trialEnd?.toISOString() ?? null),
      entitlementSource: free
        ? "free"
        : useVerified
          ? "verified"
          : trial
            ? "trial"
            : "none",
    } satisfies ModuleState;
  });
}

export async function requireModule(
  merchantId: string,
  key: string,
  intent: "read" | "write" = "read",
) {
  const states = await merchantModuleState(merchantId);
  if (
    !businessModules.some(
      (m) => m.key === key && m.availability === "implemented",
    ) ||
    (intent === "write"
      ? moduleAccess(key, states) !== "enabled"
      : !moduleReadable(key, states))
  )
    throw new Error("Business module is disabled or not entitled");
}
