import Link from "next/link";
import { CheckCircle2, Mail, CircleAlert, ArrowRight } from "lucide-react";
import { Brand } from "@/components/brand";
export function AuthResult({
  state,
  next = "/dashboard",
}: {
  state: "email" | "success" | "invalid" | "unavailable" | "signin";
  next?: string;
}) {
  const content = {
    signin: {
      title: "Sign in to continue",
      text: "We could not finish signing you in from this email link. Your email may already be confirmed. Try signing in with your email and password.",
      note: "Automatic sign-in needs the same browser that started registration. If your email is still unconfirmed, request a fresh confirmation email.",
      href: "/login",
      action: "Continue to sign in",
    },
    email: {
      title: "Check your inbox",
      text: "One more step! Open the confirmation email from SERVQO and click the activation link to finish creating your account.",
      note: "No email yet? Check your spam or junk folder and allow a few minutes for delivery.",
      href: "/login",
      action: "Back to sign in",
    },
    success: {
      title: "Your account is activated!",
      text: "Your email is confirmed. Welcome to SERVQO — you’re ready to start building your business workspace.",
      note: "Your next great service starts here.",
      href: next,
      action: "Continue to your workspace",
    },
    invalid: {
      title: "This link could not be verified",
      text: "The confirmation link may have expired, already been used, or opened in a different browser. Try signing in if you have already confirmed your email.",
      note: "For a fresh account, use the newest confirmation email and open it in the browser where you signed up.",
      href: "/login",
      action: "Go to sign in",
    },
    unavailable: {
      title: "We couldn’t check your activation",
      text: "The authentication service is temporarily unavailable. Your activation link has not been verified. Try opening the original email link again in a moment.",
      note: "If this continues, contact the business platform administrator.",
      href: "/login",
      action: "Back to sign in",
    },
  }[state];
  const Icon =
    state === "email" ? Mail : state === "success" ? CheckCircle2 : CircleAlert;
  return (
    <main className="servqo-result-page">
      <Brand />
      <section className="servqo-result-card" aria-labelledby="result-title">
        <div className={`servqo-result-icon ${state}`}>
          <Icon size={32} />
        </div>
        <span className="servqo-kicker">
          {state === "email" ? "CONFIRM YOUR EMAIL" : "ACCOUNT ACTIVATION"}
        </span>
        <h1 id="result-title">{content.title}</h1>
        <p role="status">{content.text}</p>
        <small>{content.note}</small>
        <Link className="servqo-signin" href={content.href}>
          {content.action}
          <ArrowRight size={17} />
        </Link>
        {state !== "email" && (
          <Link className="servqo-result-secondary" href="/signup">
            Back to registration
          </Link>
        )}
      </section>
      <span className="servqo-result-tagline">Serve Smarter. Grow Better.</span>
    </main>
  );
}
