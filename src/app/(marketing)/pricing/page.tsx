import { posOrdersPrice } from "@/lib/purchase-preview";
import Link from "next/link";
import { ServicePrices } from "@/components/marketing/service-prices";
import { publicMetadata } from "@/lib/public-site";
export const metadata = publicMetadata(
  "Simple, modular pricing",
  "Permanent Free Core and proposed company-level MYR System Services prices. No automatic charges.",
  "/pricing",
);
export default function Pricing() {
  return (
    <>
      <section className="p-section public-page-title">
        <span className="p-eyebrow">A smaller starting point</span>
        <h1>
          Free to start.
          <br />
          Add what you need.
        </h1>
        <p>
          Keep your company website and basic tools free. Try implemented,
          eligible System Services for the first 14 days. No card required. Your
          trial never automatically becomes a paid subscription.
        </p>
        <div className="p-notice">
          Proposed demo prices, not payable offers. Payments Coming Soon. The
          final price, exact activation/expiry timestamps and reviewed terms
          must be confirmed before paid launch.
        </div>
      </section>
      <section className="p-section">
        <ServicePrices />
        <div className="p-notice">
          <b>POS + Orders = {posOrdersPrice}/month per company.</b> The kitchen
          queue is included in the Orders service, not a third RM29 charge. Free
          Core, basic catalog and one website do not add a monthly fee. Premium
          website designs and extra storage are separate entitlements.
        </div>
      </section>
      <section className="p-section public-split">
        <div>
          <span className="p-eyebrow">After your trial</span>
          <h2>
            Your website stays.
            <br />
            You choose the services.
          </h2>
        </div>
        <div>
          <p>
            Free Core stays available. New POS orders need a verified company
            service entitlement after the trial; the purchase integration is not
            available yet. Existing tickets can still be finished or cancelled
            safely. Your saved data and authorized export stay available.
          </p>
          <p>
            Company-level access is shared by authorized members under their
            roles. Employee invitations and company switching are not available
            yet.
          </p>
          <Link className="p-button" href="/legal/subscription">
            Read the draft subscription terms
          </Link>
        </div>
      </section>
    </>
  );
}
