import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";
export const metadata: Metadata = { title: "Sign in | SERVQO" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return <AuthPage mode="login" params={await searchParams} />;
}
