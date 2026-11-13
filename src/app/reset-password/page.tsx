import { AuthPage } from "@/components/auth/auth-page";
import { supabase } from "@/lib/auth";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Choose a password | SERVQO",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  let valid = false;
  try {
    const client = await supabase();
    const { data, error } = await client.auth.getUser();
    valid = !error && !!data.user;
  } catch {
    /* Recovery must fail closed if auth is unavailable. */
  }
  if (!valid)
    redirect(
      "/forgot-password?error=Your+reset+link+has+expired.+Request+a+new+one.",
    );
  return <AuthPage mode="reset" params={await searchParams} />;
}
