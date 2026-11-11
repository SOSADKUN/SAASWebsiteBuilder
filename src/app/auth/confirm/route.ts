import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/auth";
import { safeAuthDestination } from "@/lib/auth-redirect";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const destination = safeAuthDestination(params.get("next"));
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  let confirmed = false;
  let unavailable = false;
  const type = params.get("type");
  try {
    if ((tokenHash && (type === "email" || type === "signup")) || code) {
      const client = await supabase();
      const { error } =
        tokenHash && (type === "email" || type === "signup")
          ? await client.auth.verifyOtp({ token_hash: tokenHash, type })
          : await client.auth.exchangeCodeForSession(code!);
      confirmed = !error;
    }
  } catch {
    // Never log confirmation tokens or expose raw provider errors.
    unavailable = true;
  }
  const target = confirmed
    ? `/auth/confirmed?next=${encodeURIComponent(destination)}`
    : `/auth/confirmed?status=${unavailable ? "unavailable" : "invalid"}`;
  const response = NextResponse.redirect(new URL(target, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
