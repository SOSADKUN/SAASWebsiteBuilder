"use client";
import { useState } from "react";
import Link from "next/link";
import { purchasePreview, purchaseTerms } from "@/lib/purchase-preview";
import { formatServicePrice } from "@/lib/system-services";
export function PurchaseSummary({ service }: { service: string }) {
  const [accepted, setAccepted] = useState(false);
  const summary = purchasePreview([service]);
  if (!summary)
    return (
      <div className="p-notice">
        <h2>This service is not available to purchase.</h2>
        <p>
          Coming Soon and unknown services cannot activate a trial or create a
          purchase.
        </p>
        <Link href="/pricing">Back to pricing</Link>
      </div>
    );
  return (
    <div className="public-purchase-layout">
      <div>
        <h2>What&apos;s included</h2>
        {summary.services.map((s) => (
          <article className="public-summary-service" key={s.key}>
            <h3>{s.name}</h3>
            <p>
              {s.key === "pos"
                ? "Product categories and search, a quantity-based bill, cash/unpaid recording, pickup tickets and kitchen notes. No card payments or service appointment checkout."
                : "Shared order queue, pending/preparing/ready/completed states, pending-order cancellation with a reason, cancellation acknowledgement and durable history. Updates use online polling; the screen is for staff, not a public customer display."}
            </p>
            <b>{formatServicePrice(s.monthlyPrice!)}/month/company</b>
          </article>
        ))}
        {purchaseTerms.map(([title, copy]) => (
          <section className="public-term" key={title}>
            <h3>{title}</h3>
            <p>{copy}</p>
          </section>
        ))}
      </div>
      <aside className="public-purchase-total">
        <span className="p-label">Purchase preview - no charge</span>
        <h2>
          One company.
          <br />
          Your selected services.
        </h2>
        {summary.services.map((s) => (
          <p className="public-price-line" key={s.key}>
            <span>{s.name}</span>
            <b>{formatServicePrice(s.monthlyPrice!)}</b>
          </p>
        ))}
        <p className="public-price-line public-total">
          <span>Proposed monthly total</span>
          <b>{formatServicePrice(summary.total)}</b>
        </p>
        <p>
          No extra kitchen-queue fee. License belongs to the company, not its
          email address. Members still need the appropriate roles.
        </p>
        <p>
          <b>Billing period:</b> one calendar month, as defined in this preview.
          No start/expiry timestamp is created here.
        </p>
        <label className="public-terms-check">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>
            I have read the <Link href="/legal/terms">draft terms</Link>,{" "}
            <Link href="/legal/privacy">privacy notice</Link>,{" "}
            <Link href="/legal/subscription">subscription terms</Link> and{" "}
            <Link href="/legal/cancellation">cancellation/refund policy</Link>.
            I understand this is a preview, not an agreement to pay.
          </span>
        </label>
        <button className="p-button p-primary" disabled>
          Payments Coming Soon
        </button>
        <p role="status">
          {accepted
            ? "Preview acknowledged locally. No terms acceptance record, payment or entitlement was created."
            : "Review the terms before any future purchase. Checking the box cannot enable checkout."}
        </p>
        <Link href="/signup">Start with Free Core instead</Link>
      </aside>
    </div>
  );
}
