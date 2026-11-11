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
  if ((tokenHash && params.get("type") === "email") || code) {
    const client = await supabase();
    const { error } =
      tokenHash && params.get("type") === "email"
        ? await client.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
        : await client.auth.exchangeCodeForSession(code!);
    confirmed = !error;
  }
  const target = confirmed
    ? destination
    : "/login?error=Confirmation+link+is+invalid+or+expired.+Request+a+new+email+or+sign+in.";
  const response = NextResponse.redirect(new URL(target, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
