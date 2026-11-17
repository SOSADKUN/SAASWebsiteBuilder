"use server";
import { unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { workspaceTrace } from "@/lib/workspace-diagnostics";
import { workspaceErrorCode } from "@/lib/workspace-errors";
import { mediaDeleteMessage } from "@/lib/media-errors";
import { loadOverviewMetrics, removeMediaAsset } from "./workspace-service";

export async function overviewMetrics(merchantId: string) {
  const trace = workspaceTrace("dashboard.metrics");
  try {
    return {
      ok: true as const,
      data: await trace.step("metrics", () => loadOverviewMetrics(merchantId)),
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error: "Dashboard figures are unavailable. Try again.",
      reference: trace.reference,
    };
  }
}
export async function deleteMedia(merchantId: string, assetId: string) {
  const trace = workspaceTrace("media.delete");
  try {
    await trace.step("delete", () => removeMediaAsset(merchantId, assetId));
    revalidatePath("/dashboard", "layout");
    return { ok: true as const };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error: mediaDeleteMessage(workspaceErrorCode(error)),
      reference: trace.reference,
    };
  }
}
