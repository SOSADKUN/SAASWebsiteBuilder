"use client";
import { useActionState, useState, useEffect } from "react";
import { LoaderCircle, ArrowRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { createWorkspace } from "@/server/actions";
export function WorkspaceOnboarding() {
  const [state, action, pending] = useActionState(createWorkspace, {
    error: "",
  });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setSlow(true), 10000);
    return () => window.clearTimeout(timer);
  }, [pending]);
  return (
    <main className="servqo-result-page workspace-onboarding">
      <Brand />
      <section className="servqo-result-card" aria-labelledby="workspace-title">
        <span className="servqo-kicker">MAKE YOURSELF AT HOME</span>
        <h1 id="workspace-title">Your business starts here.</h1>
        <p>Choose a name and address. We’ll set up the rest.</p>
        <form action={action} className="servqo-auth-form" aria-busy={pending}>
          {state.error && (
            <p className="notice error" role="alert">
              {state.error}
              {state.reference && (
                <span className="workspace-reference">
                  Support reference: {state.reference}
                </span>
              )}
            </p>
          )}
          <label htmlFor="business-name">
            Business name
            <input
              id="business-name"
              name="name"
              placeholder="Your café name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={100}
              required
              disabled={pending}
              autoComplete="organization"
            />
          </label>
          <label htmlFor="business-slug">
            Website address
            <input
              id="business-slug"
              name="slug"
              placeholder="your-cafe"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              minLength={3}
              maxLength={60}
              required
              disabled={pending}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <small>
              /sites/{slug || "your-cafe"} · Lowercase letters, numbers,
              hyphens.
            </small>
          </label>
          <button
            type="submit"
            className="servqo-signin"
            disabled={pending}
            onClick={() => setSlow(false)}
          >
            {pending ? (
              <>
                Creating your workspace…
                <LoaderCircle size={18} className="workspace-spinner" />
              </>
            ) : (
              <>
                Create my workspace
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="workspace-progress" role="status" aria-live="polite">
            {pending
              ? slow
                ? "This is taking longer than usual. Keep this tab open; please don’t submit again."
                : "Creating your business and starter website…"
              : "14-day free trial. Your website stays private until you publish."}
          </p>
        </form>
      </section>
      <span className="servqo-result-tagline">Serve Smarter. Grow Better.</span>
    </main>
  );
}
