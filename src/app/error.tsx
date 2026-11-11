"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="onboarding">
      <h1>Something needs attention.</h1>
      <p>Check your connection and Supabase configuration, then try again.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
