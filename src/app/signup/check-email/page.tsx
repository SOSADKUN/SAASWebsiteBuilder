import type { Metadata } from "next";
import { AuthResult } from "@/components/auth/auth-result";
import { CheckEmailNotice } from "@/components/auth/check-email-notice";
export const metadata: Metadata = {
  title: "Check your email | SERVQO",
  robots: { index: false, follow: false },
};
export default function CheckEmail() {
  return (
    <CheckEmailNotice>
      <AuthResult state="email" />
    </CheckEmailNotice>
  );
}
