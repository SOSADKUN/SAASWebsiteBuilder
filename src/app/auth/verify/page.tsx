import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { AuthResult } from "@/components/auth/auth-result";
import { safeAuthDestination } from "@/lib/auth-redirect";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Activate your account | SERVQO",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    code?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  if (params.code && !params.token_hash) {
    const query = new URLSearchParams({
      code: params.code,
      next: safeAuthDestination(params.next ?? null),
    });
    redirect(`/auth/confirm?${query}`);
  }
  if (
    !(
      params.token_hash &&
      (params.type === "email" || params.type === "signup")
    ) &&
    !params.code
  )
    return <AuthResult state="invalid" />;
  return (
    <main className="servqo-result-page">
      <Brand />
      <section className="servqo-result-card" aria-labelledby="verify-title">
        <div className="servqo-result-icon">
          <MailCheck size={32} />
        </div>
        <span className="servqo-kicker">ONE LAST STEP</span>
        <h1 id="verify-title">Activate your SERVQO account</h1>
        <p>
          Confirm your email address to start your next chapter with SERVQO.
        </p>
        <small>
          Click below to securely verify your email and activate your account.
        </small>
        <form action="/auth/confirm" method="post">
          {params.token_hash && (
            <input type="hidden" name="token_hash" value={params.token_hash} />
          )}
          {params.type && (
            <input type="hidden" name="type" value={params.type} />
          )}
          {params.code && (
            <input type="hidden" name="code" value={params.code} />
          )}
          <input
            type="hidden"
            name="next"
            value={safeAuthDestination(params.next ?? null)}
          />
          <AuthSubmit disabled={false} label="Activate account" />
        </form>
        <Link className="servqo-result-secondary" href="/login">
          Back to sign in
        </Link>
      </section>
      <span className="servqo-result-tagline">Serve Smarter. Grow Better.</span>
    </main>
  );
}
