"use server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { db } from "@/db";
import * as s from "@/db/schema";
import { authorize } from "@/lib/auth";
import { requireSubscription } from "@/lib/subscription-service";
import {
  businessModules,
  businessTypes,
  moduleAccess,
} from "@/lib/business-modules";
import {
  systemServices,
  serviceModules,
  addService,
  configurationSourceError,
} from "@/lib/system-services";
import { merchantModuleState } from "./module-service";
import { workspaceTrace } from "@/lib/workspace-diagnostics";

async function applyModuleChanges(
  merchantId: string,
  keys: string[],
  enabled: boolean,
  confirmed: boolean,
) {
  const trace = workspaceTrace("modules.configure");
  try {
    const result = await trace.step("configuration", async () => {
      await authorize(z.uuid().parse(merchantId), "modules:manage");
      z.boolean().parse(enabled);
      z.boolean().parse(confirmed);
      if (
        !keys.length ||
        keys.some(
          (key) =>
            !businessModules.some(
              (m) =>
                m.key === key && m.optional && m.availability === "implemented",
            ),
        )
      )
        throw new Error("Module unavailable");
      await requireSubscription(merchantId);
      return db().transaction(async (tx) => {
        const [merchant] = await tx
          .select()
          .from(s.merchants)
          .where(eq(s.merchants.id, merchantId))
          .for("update");
        if (!merchant || merchant.onboardingStep !== "complete")
          throw new Error("Finish business setup first.");
        const states = await merchantModuleState(merchantId, tx);
        for (const key of keys) {
          const state = states.find((m) => m.key === key);
          if (
            !state?.entitled ||
            (state.expiresAt && Date.parse(state.expiresAt) <= Date.now())
          )
            throw new Error("Module license required");
        }
        const next = states.map((m) =>
          keys.includes(m.key) ? { ...m, enabled } : m,
        );
        if (
          enabled &&
          keys.some((key) => moduleAccess(key, next) !== "enabled")
        )
          throw new Error("Enable dependencies first");
        if (
          !enabled &&
          businessModules.some(
            (m) =>
              !keys.includes(m.key) &&
              moduleAccess(m.key, states) === "enabled" &&
              moduleAccess(m.key, next) !== "enabled",
          )
        )
          throw new Error("Disable dependent modules first");
        // Existing Phase 1 queues without POS remain readable. New activation
        // and POS removal must satisfy the order-source requirement.
        const sourceError = configurationSourceError(next, keys, enabled);
        if (sourceError) throw new Error(sourceError);
        if (!enabled && !confirmed) {
          const tables = [];
          if (
            keys.some((k) => ["pos", "fnb_orders", "kitchen_queue"].includes(k))
          )
            tables.push(s.orders);
          if (keys.includes("website")) tables.push(s.pages);
          if (keys.includes("catalog")) tables.push(s.products);
          if (keys.includes("media")) tables.push(s.media);
          for (const table of tables) {
            const rows = await tx
              .select({ id: table.id })
              .from(table)
              .where(eq(table.merchantId, merchantId))
              .limit(1);
            if (rows.length) return { confirmationRequired: true as const };
          }
        }
        await tx
          .update(s.merchantModules)
          .set({ enabled })
          .where(
            and(
              eq(s.merchantModules.merchantId, merchantId),
              inArray(s.merchantModules.moduleKey, keys),
            ),
          );
        return { confirmationRequired: false as const };
      });
    });
    if (result.confirmationRequired)
      return {
        ok: false as const,
        confirmationRequired: true as const,
        error:
          "This service contains business records. Disabling hides its screens and stops new operations. Your records will be kept for reactivation and export.",
        reference: trace.reference,
      };
    revalidatePath("/dashboard", "layout");
    return { ok: true as const };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      confirmationRequired: false as const,
      error:
        "Could not change this service. Check its license, trial and dependencies. Orders needs POS; disable dependent services first. Finish business setup before managing services.",
      reference: trace.reference,
    };
  }
}
export async function configureModule(
  merchantId: string,
  key: string,
  enabled: boolean,
  confirmed = false,
) {
  return applyModuleChanges(merchantId, [key], enabled, confirmed);
}
export async function configureSystemService(
  merchantId: string,
  key: string,
  enabled: boolean,
  confirmed = false,
) {
  const service = systemServices.find((s) => s.key === key && s.implemented);
  const keys = service
    ? serviceModules(enabled ? addService([], key) : [key])
    : [];
  return applyModuleChanges(merchantId, keys, enabled, confirmed);
}
export async function setBusinessType(merchantId: string, value: string) {
  const trace = workspaceTrace("business.type");
  try {
    await trace.step("update", async () => {
      await authorize(z.uuid().parse(merchantId), "modules:manage");
      const type = z
        .enum(
          Object.keys(businessTypes) as [
            keyof typeof businessTypes,
            ...Array<keyof typeof businessTypes>,
          ],
        )
        .parse(value);
      await db()
        .update(s.merchants)
        .set({ businessType: type })
        .where(eq(s.merchants.id, merchantId));
    });
    revalidatePath("/dashboard", "layout");
    return { ok: true as const };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error: "Could not update the business type.",
      reference: trace.reference,
    };
  }
}
