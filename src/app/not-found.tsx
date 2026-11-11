export default function NotFound() {
  return (
    <main className="onboarding">
      <h1>This page is still brewing.</h1>
      <p>The website may not be published yet, or the address has changed.</p>
      <Link className="button primary" href="/dashboard">
        Go to dashboard
      </Link>
    </main>
  );
}
import Link from "next/link";
