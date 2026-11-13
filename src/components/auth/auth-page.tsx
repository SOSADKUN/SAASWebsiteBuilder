import Link from "next/link";
import { Mail } from "lucide-react";
import { signIn, signUp } from "@/server/actions";
import {
  requestPasswordReset,
  updatePassword,
} from "@/server/password-actions";
import { hasSupabaseConfiguration } from "@/lib/supabase-config";
import { Brand } from "@/components/brand";
import { PlatformIllustration } from "./platform-illustration";
import { PasswordField } from "./password-field";
import { AuthSubmit } from "./auth-submit";
export function AuthPage({
  mode,
  params,
}: {
  mode: "login" | "signup" | "forgot" | "reset";
  params: { error?: string; message?: string };
}) {
  const signup = mode === "signup",
    forgot = mode === "forgot",
    reset = mode === "reset",
    configured = hasSupabaseConfiguration();
  const heading = signup
    ? "Create your account"
    : forgot
      ? "Reset password"
      : reset
        ? "Choose a password"
        : "Welcome back";
  return (
    <main className="servqo-login">
      <div className="servqo-auth-window">
        <div className="auth-window-bar" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <section className="servqo-auth" aria-labelledby="login-title">
          <Brand />
          <div className="servqo-auth-content">
            <span className="auth-accent" aria-hidden="true" />
            <h1 id="login-title">{heading}</h1>
            <p className="servqo-auth-intro">
              {signup
                ? "Create your SERVQO workspace."
                : forgot
                  ? "Enter your email to receive a reset link."
                  : reset
                    ? "Use at least 8 characters for your new password."
                    : "Sign in to your SERVQO workspace."}
            </p>
            {!configured && (
              <p className="notice" role="status">
                Authentication is not configured. Check the deployment settings.
              </p>
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
            <form
              action={
                signup
                  ? signUp
                  : forgot
                    ? requestPasswordReset
                    : reset
                      ? updatePassword
                      : signIn
              }
              className="servqo-auth-form"
            >
              {!reset && (
                <label htmlFor="email">
                  Email address
                  <span className="auth-input-wrap">
                    <Mail size={18} aria-hidden="true" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      required
                    />
                  </span>
                </label>
              )}
              {!forgot && <PasswordField signup={signup || reset} />}
              {reset && (
                <PasswordField signup name="confirm" label="Confirm password" />
              )}
              {mode === "login" && (
                <div className="auth-form-options">
                  <Link href="/forgot-password">Forgot password?</Link>
                </div>
              )}
              <AuthSubmit
                disabled={!configured}
                label={
                  signup
                    ? "Create account"
                    : forgot
                      ? "Send reset link"
                      : reset
                        ? "Update password"
                        : "Sign in"
                }
              />
            </form>
            <div className="servqo-signup">
              {forgot || reset ? (
                <Link href="/login">Back to sign in</Link>
              ) : (
                <>
                  <span>
                    {signup
                      ? "Already have an account?"
                      : "Don't have an account?"}
                  </span>
                  <Link href={signup ? "/login" : "/signup"}>
                    {signup ? "Sign in" : "Sign up"}
                  </Link>
                </>
              )}
            </div>
            {signup && (
              <p className="servqo-confirm-note">
                After registration, check your email to confirm your account.
              </p>
            )}
          </div>
        </section>
        <PlatformIllustration />
      </div>
    </main>
  );
}
