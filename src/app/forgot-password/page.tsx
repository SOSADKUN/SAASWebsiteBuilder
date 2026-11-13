import { AuthPage } from "@/components/auth/auth-page";
export const metadata = {
  title: "Reset password | SERVQO",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return <AuthPage mode="forgot" params={await searchParams} />;
}
