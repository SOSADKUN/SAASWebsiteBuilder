import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { operationsSnapshot } from "@/server/order-service";
import { workspaceTrace } from "@/lib/workspace-diagnostics";
import { workspaceErrorCode } from "@/lib/workspace-errors";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const trace = workspaceTrace("orders.sync");
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Cookie",
  };
  const id = z.uuid().safeParse(request.nextUrl.searchParams.get("merchantId"));
  if (!id.success)
    return NextResponse.json(
      { error: "Invalid business ID" },
      { status: 400, headers },
    );
  try {
    return NextResponse.json(
      await trace.step("snapshot", () =>
        operationsSnapshot(
          id.data,
          request.nextUrl.searchParams.get("menu") === "1",
        ),
      ),
      { headers },
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT;")
    )
      return NextResponse.json(
        { error: "Your session expired. Sign in again." },
        { status: 401, headers },
      );
    const code = workspaceErrorCode(error);
    const denied =
      error instanceof Error &&
      ["Business access denied", "Workspace permission required"].includes(
        error.message,
      );
    return NextResponse.json(
      {
        error: denied
          ? "You do not have access to these orders."
          : ["42P01", "42703"].includes(code)
            ? "POS setup is pending. Apply the orders database migration before using these screens."
            : "Orders could not sync. Check the connection and try again.",
        reference: trace.reference,
      },
      { status: denied ? 403 : 503, headers },
    );
  }
}
