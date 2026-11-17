import { posOrdersPrice } from "@/lib/purchase-preview";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Globe2,
  Layers3,
  Monitor,
  ClipboardList,
  Coffee,
  Croissant,
  Scissors,
  Sparkles,
  Palette,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { ServicePrices } from "./service-prices";
export const marketingFaqs = [
  [
    "Is Free Core really free after 14 days?",
    "Yes. Your Dashboard, business profile, basic catalog, one multi-page website and media within the free quota remain available. The 14-day limit applies to eligible paid System Services, not Free Core.",
  ],
  [
    "Do I need a credit card?",
    "No. No card is required and the trial does not automatically become a paid subscription. Payments are not connected yet; all monthly prices here are proposed demo prices.",
  ],
  [
    "When does my trial start?",
    "The one-time 14-day company trial starts when your business workspace is created, not when you later enable a service. Changing services, business type or signing in does not restart it.",
  ],
  [
    "What happens to orders after the trial?",
    "New paid-service operations require a verified service entitlement after expiry. Existing tickets can still be finished or cancelled safely under the order rules. Saved history and authorized data export remain available.",
  ],
  [
    "Does it work for salons and cake shops?",
    "The website builder, business profile and basic product catalog can be used across these categories. Product-only retail pickup POS is implemented. Salon appointments, staff scheduling and custom cake pre-orders are Coming Soon and cannot be activated.",
  ],
  [
    "Can I use two devices?",
    "Each device signs in independently. A cashier device and a staff Orders device can share the company's order queue online, subject to roles and enabled services. Updates use polling every few seconds. There is no offline checkout or dedicated public customer display.",
  ],
  [
    "Are payments, printers and premium designs included?",
    "POS records cash or unpaid tickets; it does not process card, QR or online payments. Receipt printers and other hardware integrations are not available. Premium website designs require separate ownership, and service licenses do not increase storage quota.",
  ],
] as const;
function ProductPreview() {
  return (
    <div
      className="public-product-preview"
      aria-label="Illustrative POS view with sample data"
    >
      <div className="preview-top">
        <span>
          <Monitor size={16} /> POS / Cashier
        </span>
        <span className="preview-sample">Sample data</span>
      </div>
      <div className="preview-content">
        <div>
          <div className="preview-search">Search your products...</div>
          <div className="preview-tabs">
            <b>All items</b>
            <span>Coffee</span>
            <span>Bakery</span>
          </div>
          <div className="preview-products">
            {[
              ["coffee", "House latte", "RM12.00"],
              ["pastry", "Butter croissant", "RM9.00"],
              ["tea", "Matcha latte", "RM14.00"],
              ["cookie", "Chocolate cookie", "RM8.00"],
            ].map(([type, name, price]) => (
              <div className="preview-product" key={name}>
                <div className={`preview-food ${type}`}>
                  {type === "coffee" || type === "tea" ? (
                    <Coffee />
                  ) : (
                    <Croissant />
                  )}
                </div>
                <strong>{name}</strong>
                <span>
                  {price}
                  <Plus size={15} />
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="preview-bill">
          <h3>Current bill</h3>
          <small>Counter pickup</small>
          <p>
            1 &#215; House latte <b>RM12</b>
          </p>
          <p>
            1 &#215; Butter croissant <b>RM9</b>
          </p>
          <div className="preview-bill-total">
            Total <strong>RM21.00</strong>
          </div>
          <div className="preview-send">
            Send to kitchen <ArrowUpRight size={15} />
          </div>
          <div className="preview-ticket">
            <CheckCircle2 size={16} />
            <span>
              Order #0024
              <br />
              <small>Preparing - example ticket</small>
            </span>
          </div>
        </div>
      </div>
      <div className="preview-caption">
        Illustrative workflow. No real order is created.
      </div>
    </div>
  );
}
export function Landing() {
  return (
    <>
      <section className="public-hero p-section">
        <div className="public-hero-copy">
          <span className="p-eyebrow">
            <i /> Built for the business you run
          </span>
          <h1>
            Your website.
            <br />
            Your daily work.
            <br />
            <em>A little simpler.</em>
          </h1>
          <p>
            Meet SERVQOO: a modular workspace for small businesses. Build your
            website for free, then add the tools that fit your day.
          </p>
          <div className="public-hero-actions">
            <Link className="p-button p-primary" href="/signup">
              Start free <ArrowUpRight size={18} />
            </Link>
            <Link className="p-button" href="/demo">
              Explore the website demo
            </Link>
          </div>
          <div className="public-hero-assurance">
            <span>
              <Check size={15} /> Permanent Free Core
            </span>
            <span>
              <Check size={15} /> No card required
            </span>
          </div>
        </div>
        <div className="public-hero-art">
          <div className="public-orbit" aria-hidden="true" />
          <ProductPreview />
          <div className="public-free-note">
            <Globe2 size={21} />
            <span>
              One company. One website.
              <br />
              <b>Free to build. Free to keep.</b>
            </span>
          </div>
        </div>
      </section>
      <section className="public-industries p-section">
        <span className="p-eyebrow">Small business, many shapes</span>
        <div>
          {[
            [Coffee, "Caf\u00e9 / Restaurant"],
            [Croissant, "Cake Shop / Bakery"],
            [Palette, "Nail Salon"],
            [Scissors, "Hair Salon"],
            [Sparkles, "Beauty Studio"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Coffee;
            return (
              <span key={String(label)}>
                <I size={21} />
                {String(label)}
              </span>
            );
          })}
        </div>
        <p>
          Website and product catalog foundations for all five. Product pickup
          POS is available; bookings, custom cake pre-orders and staff
          scheduling are Coming Soon. No restaurant table-management or salon
          scheduling engine is claimed.
        </p>
      </section>
      <section className="p-section public-features" id="features">
        <div className="public-section-heading">
          <span className="p-eyebrow">Start with the essentials</span>
          <h2>
            A home for your business.
            <br />
            Tools for the work behind it.
          </h2>
          <p>
            Keep the parts you need together, without signing up for features
            you don&apos;t use.
          </p>
        </div>
        <div className="public-feature-grid">
          <article className="public-feature website-feature">
            <span className="p-label">Permanent Free Core</span>
            <h3>A website that feels like you.</h3>
            <p>
              Arrange sections, edit your content, preview layouts and publish
              one company website with multiple pages. Basic designs are
              included; premium designs keep their own ownership rules.
            </p>
            <div className="mini-website">
              <div>
                <span>YOUR BUSINESS</span>
                <Globe2 size={18} />
              </div>
              <h4>
                Make yourself
                <br />
                easy to find.
              </h4>
              <p>
                Your story. Your products.
                <br />
                Your place online.
              </p>
              <div className="mini-web-blocks">
                <span />
                <span />
                <span />
              </div>
            </div>
            <Link href="/demo">
              Try the layout preview <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className="public-feature">
            <Monitor size={27} />
            <span className="p-label">Implemented - trial eligible</span>
            <h3>From menu to pickup ticket.</h3>
            <p>
              Product POS with categories, search, quantities and kitchen notes.
              Record cash or unpaid tickets. Product-only retail checkout also
              works for other business types.
            </p>
            <Link href="/purchase?service=pos">
              See the actual scope <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className="public-feature">
            <ClipboardList size={27} />
            <span className="p-label">Implemented - requires POS</span>
            <h3>Keep the counter and staff in sync.</h3>
            <p>
              A shared online queue: pending, preparing, ready and completed.
              Mistakes can be cancelled while pending, with a reason and kitchen
              acknowledgement.
            </p>
            <div className="public-statuses">
              <span>Pending</span>
              <span>Preparing</span>
              <span>Ready</span>
            </div>
            <Link href="/purchase?service=orders">
              Explore Orders & Kitchen <ArrowUpRight size={16} />
            </Link>
          </article>
        </div>
      </section>
      <section className="p-section public-how" id="how-it-works">
        <div>
          <span className="p-eyebrow">From first visit to first workspace</span>
          <h2>
            Four steps.
            <br />
            Your own starting point.
          </h2>
        </div>
        <ol>
          {[
            [
              "Create & verify",
              "Sign up with your email and complete email verification.",
            ],
            [
              "Set up your business",
              "Add your business details and choose your business type.",
            ],
            [
              "Choose your tools",
              "Keep Free Core, then select any compatible, implemented trial-eligible services. No optional services is fine too.",
            ],
            [
              "Make it yours",
              "Enter your Dashboard, edit your website and try your selected services within the original 14-day window.",
            ],
          ].map(([title, copy], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="p-section public-trial">
        <div>
          <Layers3 size={30} />
          <span className="p-eyebrow">Free Core stays free</span>
          <h2>
            Try the extras.
            <br />
            Keep the essentials.
          </h2>
          <p>
            Your first 14 days include access to implemented, eligible paid
            System Services. No credit card. No automatic subscription. After
            the trial, choose which services you want to purchase once payments
            become available.
          </p>
          <p>
            Your website, basic catalog and company workspace remain free. Media
            is subject to storage quota; historical data and export stay
            available. No forced paid upgrade to keep your basic website
            published.
          </p>
          <Link className="p-button" href="/signup">
            Create your free workspace <ArrowUpRight size={18} />
          </Link>
        </div>
        <ul>
          {[
            "One public website, multiple pages",
            "Basic product catalog & business profile",
            "20 MiB free storage; 50 MiB during the original trial",
            "No automatic charge or paid activation",
            "Company-level services, role-based access",
          ].map((t) => (
            <li key={t}>
              <CheckCircle2 size={20} />
              {t}
            </li>
          ))}
        </ul>
      </section>
      <section className="p-section" id="pricing">
        <div className="public-section-heading">
          <span className="p-eyebrow">Modular by design</span>
          <h2>Your company. Your choice.</h2>
          <p>
            Proposed monthly prices per company. Payments Coming Soon. POS +
            Orders totals {posOrdersPrice}, with no separate kitchen-queue
            charge.
          </p>
        </div>
        <ServicePrices />
        <p className="p-muted">
          Estimates only, not payable offers. Final billing scope and policies
          need review before paid launch.{" "}
          <Link href="/pricing">Compare pricing and dependencies</Link>.
        </p>
      </section>
      <section className="p-section public-faq" id="faq">
        <div>
          <span className="p-eyebrow">A few useful answers</span>
          <h2>
            Before you
            <br />
            get started.
          </h2>
          <Link href="/contact">
            Contact SERVQOO <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          {marketingFaqs.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Plus size={17} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="p-section public-final-cta">
        <span className="p-eyebrow">A practical place to begin</span>
        <h2>
          Put your business
          <br />
          in one workspace.
        </h2>
        <Link className="p-button p-primary" href="/signup">
          Start free with SERVQOO <ArrowUpRight size={18} />
        </Link>
        <p>
          Already have a workspace? <Link href="/login">Log in</Link>
        </p>
      </section>
    </>
  );
}
