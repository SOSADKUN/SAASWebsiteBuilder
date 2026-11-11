import type { Metadata } from "next";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { signIn, signUp } from "@/server/actions";
import { hasSupabaseConfiguration } from "@/lib/supabase-config";
import { Brand } from "@/components/brand";
import { LoginShowcase } from "@/components/auth/login-showcase";
import { AuthSubmit } from "@/components/auth/auth-submit";
export const metadata: Metadata = { title: "Sign in | SERVQO" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const configured = hasSupabaseConfiguration();
  return (
    <main className="servqo-login">
      <LoginShowcase />
      <section className="servqo-auth" aria-labelledby="login-title">
        <div className="servqo-auth-top">
          <Brand />
          <span>YOUR BUSINESS. IN GOOD HANDS.</span>
        </div>
        <div className="servqo-auth-content">
          <span className="servqo-kicker">LESS ADMIN. MORE POSSIBILITY.</span>
          <h1 id="login-title">
            Welcome back<span>.</span>
          </h1>
          <p className="servqo-auth-intro">
            Your next great service starts here.
            <br />
            Sign in to your SERVQO workspace.
          </p>
          {!configured && (
            <div className="notice">
              Setup required: configure the Supabase URL, public key and
              database connection in your environment. See DEPLOYMENT.md for
              instructions.
            </div>
          )}
          {params.error && (
            <p className="notice error" role="alert">
              {params.error}
            </p>
          )}
          {params.message && (
            <p className="notice" role="status">
              {params.message}
            </p>
          )}
          <form action={signIn} className="servqo-auth-form">
            <label htmlFor="email">
              Email address
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@yourbusiness.com"
                required
              />
            </label>
            <label htmlFor="password">
              Password
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                minLength={8}
                required
              />
            </label>
            <AuthSubmit disabled={!configured} />
            <div className="servqo-signup">
              <span>New to SERVQO?</span>
              <button type="submit" formAction={signUp} disabled={!configured}>
                Create an account <ArrowUpRight size={14} />
              </button>
            </div>
          </form>
          <p className="servqo-confirm-note">
            Creating an account? Enter your email and a password above. We’ll
            send you a confirmation link.
          </p>
          <div className="servqo-auth-assurance">
            <LockKeyhole size={14} />
            <span>A secure home for your business.</span>
          </div>
        </div>
        <footer className="servqo-auth-footer">
          <span>© {new Date().getFullYear()} SERVQO</span>
          <span>Serve Smarter. Grow Better.</span>
        </footer>
      </section>
    </main>
  );
}
