import Link from "next/link";
import { Brand } from "@/components/brand";
import "./public.css";
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-site">
      <a className="public-skip" href="#public-main">
        Skip to content
      </a>
      <header className="public-nav">
        <Link className="public-brand" href="/" aria-label="SERVQOO home">
          <Brand />
        </Link>
        <nav aria-label="Public navigation">
          <Link href="/demo">Website demo</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <div className="public-nav-actions">
          <Link href="/login">Log in</Link>
          <Link className="p-button p-primary" href="/signup">
            Start free <span aria-hidden="true">&#8599;</span>
          </Link>
        </div>
      </header>
      <main id="public-main">{children}</main>
      <footer className="public-footer">
        <div>
          <Link href="/" aria-label="SERVQOO home">
            <Brand />
          </Link>
          <p>
            Your website. Your daily work.
            <br />
            One company workspace.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/pricing">System Services & pricing</Link>
          <Link href="/demo">Explore the website demo</Link>
          <Link href="/contact">Contact SERVQOO</Link>
          <Link href="/signup">Create an account</Link>
        </nav>
        <nav aria-label="Legal information">
          <Link href="/legal/terms">Terms of Service</Link>
          <Link href="/legal/privacy">Privacy Notice</Link>
          <Link href="/legal/subscription">Subscription Terms</Link>
          <Link href="/legal/cancellation">Cancellation & Refund Policy</Link>
          <Link href="/legal/discontinuation">
            Service Discontinuation Policy
          </Link>
        </nav>
        <p className="public-footer-note">
          Prices are proposed previews. Payments are not connected. Legal
          documents are drafts pending human/legal review.
        </p>
      </footer>
    </div>
  );
}
