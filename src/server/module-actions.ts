"use server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
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
import { merchantModuleState } from "./module-service";
import { workspaceTrace } from "@/lib/workspace-diagnostics";

export async function configureModule(
  merchantId: string,
  key: string,
  enabled: boolean,
) {
  const trace = workspaceTrace("modules.configure");
  try {
    await trace.step("configuration", async () => {
      await authorize(z.uuid().parse(merchantId), "modules:manage");
      z.boolean().parse(enabled);
      const definition = businessModules.find((m) => m.key === key);
      if (!definition?.optional || definition.availability !== "implemented")
        throw new Error("Module unavailable");
      await requireSubscription(merchantId);
      await db().transaction(async (tx) => {
        await tx
          .select()
          .from(s.merchants)
          .where(eq(s.merchants.id, merchantId))
          .for("update");
        const states = await merchantModuleState(merchantId, tx);
        const state = states.find((m) => m.key === key);
        if (
          !state?.entitled ||
          (state.expiresAt && Date.parse(state.expiresAt) <= Date.now())
        )
          throw new Error("Module license required");
        const next = states.map((m) => (m.key === key ? { ...m, enabled } : m));
        if (enabled && moduleAccess(key, next) !== "enabled")
          throw new Error("Enable dependencies first");
        if (
          !enabled &&
          businessModules.some(
            (m) =>
              m.key !== key &&
              moduleAccess(m.key, states) === "enabled" &&
              moduleAccess(m.key, next) !== "enabled",
          )
        )
          throw new Error("Disable dependent modules first");
        await tx
          .update(s.merchantModules)
          .set({ enabled })
          .where(
            and(
              eq(s.merchantModules.merchantId, merchantId),
              eq(s.merchantModules.moduleKey, key),
            ),
          );
      });
    });
    revalidatePath("/dashboard", "layout");
    return { ok: true as const };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        "Could not change this module. Check its license and dependencies. Disable dependent modules first, or enable required modules first.",
      reference: trace.reference,
    };
  }
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
