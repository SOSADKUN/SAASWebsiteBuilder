import type { Metadata } from "next";
import { supabase } from "@/lib/auth";
import { safeAuthDestination } from "@/lib/auth-redirect";
import { AuthResult } from "@/components/auth/auth-result";
export const metadata: Metadata = {
  title: "Account activation | SERVQO",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Confirmed({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; next?: string }>;
}) {
  const params = await searchParams;
  let state: "success" | "invalid" | "unavailable" | "signin" =
    params.status === "unavailable"
      ? "unavailable"
      : params.status === "signin"
        ? "signin"
        : "invalid";
  if (!params.status) {
    try {
      const client = await supabase();
      const { data, error } = await client.auth.getUser();
      if (!error && data.user?.email_confirmed_at) state = "success";
    } catch {
      state = "unavailable";
    }
  }
  return (
    <AuthResult state={state} next={safeAuthDestination(params.next ?? null)} />
  );
}
