import { NextResponse } from "next/server";
import { upload, uploadMenuProductImage } from "@/server/actions";
import { workspaceTrace } from "@/lib/workspace-diagnostics";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const trace = workspaceTrace("media.upload");
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  if (Number(request.headers.get("content-length")) > 2 * 1024 * 1024 + 65536)
    return NextResponse.json(
      { error: "Optimized image must fit 2 MiB" },
      { status: 413 },
    );
  try {
    const form = await request.formData();
    const merchantId = String(form.get("merchantId") ?? "");
    const result = await trace.step("upload", async () =>
      form.get("kind") === "product"
        ? uploadMenuProductImage(merchantId, form)
        : { ok: true as const, url: await upload(merchantId, form) },
    );
    return NextResponse.json(
      result,
      result.ok
        ? { headers: { "Cache-Control": "no-store" } }
        : { status: 400 },
    );
  } catch (error) {
    const text = error instanceof Error ? error.message : "";
    const safe =
      text.startsWith("Company storage quota exceeded") ||
      text.startsWith("Upload could not be confirmed") ||
      text === "Only valid JPEG, PNG and WebP images are accepted";
    return NextResponse.json(
      {
        error: safe
          ? text
          : "Image upload failed. Check workspace access and storage setup, then retry the same image.",
        reference: trace.reference,
      },
      { status: 400 },
    );
  }
}
