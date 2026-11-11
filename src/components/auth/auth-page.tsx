import Link from "next/link";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { signIn, signUp } from "@/server/actions";
import { hasSupabaseConfiguration } from "@/lib/supabase-config";
import { Brand } from "@/components/brand";
import { LoginShowcase } from "@/components/auth/login-showcase";
import { AuthSubmit } from "@/components/auth/auth-submit";
export function AuthPage({
  mode,
  params,
}: {
  mode: "login" | "signup";
  params: { error?: string; message?: string };
}) {
  const signup = mode === "signup";
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
            {signup ? "Create your account" : "Welcome back"}
            <span>.</span>
          </h1>
          <p className="servqo-auth-intro">
            Your next great service starts here.
            <br />
            {signup
              ? "Start your journey with SERVQO."
              : "Sign in to your SERVQO workspace."}
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
          <form action={signup ? signUp : signIn} className="servqo-auth-form">
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
                autoComplete={signup ? "new-password" : "current-password"}
                placeholder={
                  signup
                    ? "Create a password (8+ characters)"
                    : "Enter your password"
                }
                minLength={8}
                required
              />
            </label>
            <AuthSubmit
              disabled={!configured}
              label={
                signup ? "Create your account" : "Sign in to your workspace"
              }
            />
          </form>
          <div className="servqo-signup">
            <span>
              {signup ? "Already have an account?" : "New to SERVQO?"}
            </span>
            <Link href={signup ? "/login" : "/signup"}>
              {signup ? "Sign in" : "Create an account"}{" "}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          {signup && (
            <p className="servqo-confirm-note">
              Use at least 8 characters for your password. After registration,
              check your email for a confirmation link.
            </p>
          )}
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
