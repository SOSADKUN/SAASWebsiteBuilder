import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";
export const metadata: Metadata = { title: "Create an account | SERVQO" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return <AuthPage mode="signup" params={await searchParams} />;
}
