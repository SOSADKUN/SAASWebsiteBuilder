"use server";
import { unstable_rethrow } from "next/navigation";
import { workspaceTrace } from "@/lib/workspace-diagnostics";
import { unlock, saveLayout } from "./actions";
import type { Section } from "@/lib/models";
import { workspaceErrorCode } from "@/lib/workspace-errors";
export async function unlockDesignDemo(merchantId: string, key: string) {
  const trace = workspaceTrace("design.demo.unlock");
  try {
    await trace.step("entitlement", () => unlock(merchantId, key));
    return { ok: true as const, key };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false as const,
      error:
        "Could not unlock this design. Check your workspace access and subscription, then try again.",
      reference: trace.reference,
    };
  }
}
export async function saveEditorLayout(
  merchantId: string,
  pageId: string,
  sections: Section[],
  revision: number,
  publish: boolean,
) {
  const trace = workspaceTrace("editor.save");
  try {
    return {
      ok: true as const,
      ...(await trace.step(publish ? "publish" : "draft", () =>
        saveLayout(merchantId, pageId, sections, revision, publish),
      )),
    };
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "";
    const code = workspaceErrorCode(error);
    const allowed = [
      "Save your draft before publishing.",
      "This page changed in another tab. Restore the saved draft before saving.",
      "Page not found",
    ];
    const errorMessage = allowed.includes(message)
      ? message
      : message.startsWith("Unlock ")
        ? "Unlock or remove preview-only designs before saving."
        : message.startsWith("Subscription required:")
          ? "Your subscription has expired. Open Subscription & Billing to continue."
          : code === "23503"
            ? "The editor needs a database update. Apply the latest migrations, reload and try again."
            : "Could not save this page. Check your connection and workspace access, then try again.";
    return {
      ok: false as const,
      error: errorMessage,
      reference: trace.reference,
    };
  }
}
