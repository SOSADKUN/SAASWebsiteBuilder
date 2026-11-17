import { posOrdersPrice } from "@/lib/purchase-preview";
import Link from "next/link";
import { systemServices, formatServicePrice } from "@/lib/system-services";
import { publicServiceKeys } from "@/lib/purchase-preview";
export function ServicePrices() {
  return (
    <div className="public-price-grid">
      <article className="public-price-card free-card">
        <span className="p-label">Always included</span>
        <h3>Free Core</h3>
        <p className="public-price">
          RM0 <small>/ company</small>
        </p>
        <p>
          One multi-page public website, basic product catalog, business
          profile, Dashboard and media within quota.
        </p>
        <ul>
          <li>Edit drafts and publish your website</li>
          <li>20 MiB free Company Storage</li>
          <li>Export your saved business data</li>
        </ul>
        <Link className="p-button p-primary" href="/signup">
          Start with Free Core
        </Link>
      </article>
      {publicServiceKeys.map((key) => {
        const s = systemServices.find((s) => s.key === key)!;
        return (
          <article className="public-price-card" key={key}>
            <span className={`p-label ${s.implemented ? "" : "p-planned"}`}>
              {s.implemented
                ? "Implemented - 14-day trial eligible"
                : "Coming Soon - not available"}
            </span>
            <h3>{s.name}</h3>
            <p className="public-price">
              {formatServicePrice(s.monthlyPrice!)}
              <small>/ month / company</small>
            </p>
            <p>
              {key === "pos"
                ? "Product pickup checkout, category browsing, cash/unpaid tickets and kitchen notes."
                : key === "orders"
                  ? "Shared staff queue with preparation, ready, completed and cancellation acknowledgement."
                  : "Planned service. No activation, trial or purchase is available."}
            </p>
            <p className="public-dependency">
              {key === "orders"
                ? `Requires Product POS. Orders includes both order tracking and the kitchen queue. POS + Orders: ${posOrdersPrice}/month total.`
                : key === "pos"
                  ? "Uses the product catalog included in Free Core."
                  : s.dependencies.length
                    ? `Planned dependencies: ${s.dependencies.map((d) => systemServices.find((s) => s.key === d)?.name ?? d).join(", ")}. Final scope pending.`
                    : "Final functionality and dependencies pending."}
            </p>
            {s.implemented ? (
              <Link className="p-button" href={`/purchase?service=${s.key}`}>
                View purchase preview <span aria-hidden="true">&#8599;</span>
              </Link>
            ) : (
              <button className="p-button" disabled>
                Coming Soon
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
