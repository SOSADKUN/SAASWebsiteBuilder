import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/auth";
import { safeAuthDestination } from "@/lib/auth-redirect";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  // A default Supabase email has already verified the email upstream. Its
  // short-lived PKCE code only finishes the browser session; do not ask users
  // to activate a second time or delay the exchange behind another button.
  if (
    request.nextUrl.searchParams.get("code") &&
    !request.nextUrl.searchParams.get("token_hash")
  )
    return completeConfirmation(request, request.nextUrl.searchParams, 307);
  const target = new URL("/auth/verify", request.url);
  for (const key of ["token_hash", "type", "code", "next"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export async function POST(request: NextRequest) {
  const body = await request.formData();
  const params = new URLSearchParams();
  for (const key of ["token_hash", "type", "code", "next"]) {
    const value = body.get(key);
    if (typeof value === "string") params.set(key, value);
  }
  return completeConfirmation(request, params, 303);
}
async function completeConfirmation(
  request: NextRequest,
  params: URLSearchParams,
  status: 303 | 307,
) {
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
    : `/auth/confirmed?status=${unavailable ? "unavailable" : code && !tokenHash ? "signin" : "invalid"}`;
  const response = NextResponse.redirect(new URL(target, request.url), status);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
