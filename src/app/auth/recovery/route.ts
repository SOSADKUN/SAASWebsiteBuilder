import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/auth";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let valid = false;
  if (code)
    try {
      const client = await supabase();
      const { error } = await client.auth.exchangeCodeForSession(code);
      valid = !error;
    } catch {
      /* Never expose recovery codes or provider responses. */
    }
  const response = NextResponse.redirect(
    new URL(
      valid
        ? "/reset-password"
        : "/forgot-password?error=Your+reset+link+has+expired.+Request+a+new+one.",
      request.url,
    ),
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
