"use server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { db } from "@/db";
import * as s from "@/db/schema";
import { authorize } from "@/lib/auth";
import {
  businessTypes,
  businessModules,
  type BusinessType,
} from "@/lib/business-modules";
import {
  recommendedServices,
  selectionError,
  serviceModules,
} from "@/lib/system-services";

import { merchantModuleState } from "./module-service";
import { workspaceTrace } from "@/lib/workspace-diagnostics";
import { workspaceErrorMessage } from "@/lib/workspace-errors";
import { initialBusinessLayout } from "@/lib/business-defaults";
const changeSchema = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("details"),
    ownerName: z.string().trim().min(2).max(100),
    name: z.string().trim().min(2).max(100),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .min(3)
      .max(60),
  }),
  z.object({
    step: z.literal("business_type"),
    businessType: z.enum(
      Object.keys(businessTypes) as [BusinessType, ...BusinessType[]],
    ),
  }),
  z.object({
    step: z.literal("services"),
    services: z.array(z.string().max(80)).max(30),
  }),
  z.object({
    step: z.literal("service_draft"),
    services: z.array(z.string().max(80)).max(30),
  }),
  z.object({ step: z.literal("complete") }),
]);
class SetupValidationError extends Error {}
export async function saveBusinessSetup(
  merchantId: string,
  input: z.infer<typeof changeSchema>,
) {
  const trace = workspaceTrace("onboarding.save");
  try {
    await trace.step("setup", async () => {
      const actor = await authorize(
        z.uuid().parse(merchantId),
        "modules:manage",
      );
      const value = changeSchema.parse(input);
      await db().transaction(async (tx) => {
        const [merchant] = await tx
          .select()
          .from(s.merchants)
          .where(eq(s.merchants.id, merchantId))
          .for("update");
        if (!merchant) throw new Error("Business access denied");
        if (merchant.onboardingStep === "complete") return; // Retried completion is idempotent.
        if (value.step === "details") {
          await tx
            .update(s.merchants)
            .set({
              name: value.name,
              slug: value.slug,
              onboardingStep: "business_type",
            })
            .where(eq(s.merchants.id, merchantId));
          await tx
            .update(s.profiles)
            .set({ name: value.ownerName })
            .where(eq(s.profiles.id, actor.id));
          await tx
            .update(s.websites)
            .set({ title: value.name })
            .where(eq(s.websites.merchantId, merchantId));
          return;
        }
        if (value.step === "business_type") {
          // Starter content only; no operations are active before completion.
          await tx
            .update(s.merchants)
            .set({
              businessType: value.businessType,
              onboardingServices: recommendedServices(value.businessType),
              onboardingStep: "services",
            })
            .where(eq(s.merchants.id, merchantId));
          await tx
            .update(s.pages)
            .set({
              draft: initialBusinessLayout(merchant.name, value.businessType),
            })
            .where(
              and(eq(s.pages.merchantId, merchantId), eq(s.pages.path, "/")),
            );
          return;
        }
        if (merchant.onboardingStep === "business_type")
          throw new SetupValidationError("Choose a business type first.");
        if (value.step === "services" || value.step === "service_draft") {
          const error = selectionError(
            value.services,
            merchant.businessType as BusinessType,
            await merchantModuleState(merchantId, tx),
          );
          if (error) throw new SetupValidationError(error);
          await tx
            .update(s.merchants)
            .set({
              onboardingServices: value.services,
              onboardingStep: value.step === "services" ? "review" : "services",
            })
            .where(eq(s.merchants.id, merchantId));
          return;
        }
        if (merchant.onboardingStep !== "review")
          throw new SetupValidationError(
            "Review your service selection first.",
          );
        const selected = merchant.onboardingServices;
        const error = selectionError(
          selected,
          merchant.businessType as BusinessType,
          await merchantModuleState(merchantId, tx),
        );
        if (error) throw new SetupValidationError(error);
        // Effective module state validates explicit trials or verified service licenses.

        const enabled = serviceModules(selected);
        const optional = businessModules
          .filter((m) => m.optional)
          .map((m) => m.key);
        await tx
          .update(s.merchantModules)
          .set({ enabled: false })
          .where(
            and(
              eq(s.merchantModules.merchantId, merchantId),
              inArray(s.merchantModules.moduleKey, optional),
            ),
          );
        if (enabled.length)
          await tx
            .update(s.merchantModules)
            .set({ enabled: true })
            .where(
              and(
                eq(s.merchantModules.merchantId, merchantId),
                inArray(s.merchantModules.moduleKey, enabled),
              ),
            );
        await tx
          .update(s.merchants)
          .set({ onboardingStep: "complete" })
          .where(eq(s.merchants.id, merchantId));
      });
    });
    revalidatePath("/dashboard", "layout");
    return { ok: true as const };
  } catch (error) {
    unstable_rethrow(error);
    const safe = error instanceof SetupValidationError;
    return {
      ok: false as const,
      error: safe
        ? (error as Error).message
        : "Could not save business setup. Check your selection, trial and workspace access. " +
          workspaceErrorMessage(error),
      reference: trace.reference,
    };
  }
}
