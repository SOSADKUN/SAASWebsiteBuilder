import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  publicOrigin,
  publicContacts,
  publicMetadata,
  marketingRedirects,
  publicPaths,
} from "../src/lib/public-site";
import {
  purchasePreview,
  purchaseTerms,
  posOrdersPrice,
} from "../src/lib/purchase-preview";
import { systemServices, estimatedMonthly } from "../src/lib/system-services";
import Home from "../src/app/page";
import { ServicePrices } from "../src/components/marketing/service-prices";
import { PurchaseSummary } from "../src/components/marketing/purchase-summary";
import { WebsiteDemo } from "../src/components/marketing/website-demo";
import { legalPages } from "../src/lib/legal-content";
import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
vi.mock("@/db", () => ({
  db: () => {
    throw Error("Public marketing must not query tenant data");
  },
}));
afterEach(() => vi.unstubAllEnvs());
describe("public discovery without authentication or paid activation", () => {
  it("renders landing navigation and honest Free Core/trial/category scope without a dashboard redirect", () => {
    const html = renderToStaticMarkup(<Home />);
    for (const text of [
      "SERVQOO",
      "Free Core",
      "14 days",
      "No card required",
      "Coming Soon",
      "No automatic subscription",
      "Nail Salon",
      "Hair Salon",
      "Beauty Studio",
    ])
      expect(html).toContain(text);
    for (const href of ["/signup", "/login", "/pricing", "/demo", "/contact"])
      expect(html).toContain(`href="${href}"`);
    expect(html).toContain("Illustrative workflow. No real order is created.");
    expect(html).not.toContain('href="/dashboard');
  });
  it("uses centralized prices and bills the kitchen queue only once", () => {
    expect(purchasePreview(["orders"])).toMatchObject({
      total: 5800,
      canCheckout: false,
      keys: expect.arrayContaining(["pos", "orders"]),
    });
    expect(purchasePreview(["pos", "orders", "pos"])?.total).toBe(
      estimatedMonthly(["pos", "orders"]),
    );
    expect(posOrdersPrice).toBe("RM58.00");
    expect(purchasePreview(["pos"])?.total).toBe(2900);
  });
  it.each([
    "appointments",
    "cake_preorders",
    "staff_availability",
    "inventory",
    "not-real",
    "__proto__",
  ])("denies purchase/activation of unavailable service %s", (key) =>
    expect(purchasePreview([key])).toBeNull(),
  );
  it("does not silently filter forged selections or empty requests into a valid purchase", () => {
    expect(purchasePreview([])).toBeNull();
    expect(purchasePreview(["pos", "appointments"])).toBeNull();
  });
  it("labels planned services and makes their buttons unavailable", () => {
    const html = renderToStaticMarkup(<ServicePrices />);
    for (const key of [
      "cake_preorders",
      "appointments",
      "staff_availability",
    ]) {
      expect(systemServices.find((s) => s.key === key)?.implemented).toBe(
        false,
      );
      expect(html).not.toContain(`href="/purchase?service=${key}"`);
    }
    expect(html.match(/Coming Soon - not available/g)).toHaveLength(3);
    expect(html).toContain("RM39.00");
    expect(html).toContain("RM19.00");
    expect(html).not.toContain("RM87.00");
    expect(html).toContain("Requires Product POS");
  });
  it("renders a disabled, non-submitting purchase summary and the proposed policy scope", () => {
    const html = renderToStaticMarkup(<PurchaseSummary service="orders" />);
    expect(html).toContain("RM58.00");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Payments Coming Soon/);
    expect(html).not.toContain("<form");
    expect(html).not.toContain("action=");
    expect(html).toContain("one calendar month");
    expect(html).toContain("No extra kitchen-queue fee");
    expect(html).toContain("general");
    expect(html).toContain("No payment processing");
    expect(html).toContain("Refunds");
    expect(html).toContain("Retention and export");
    expect(purchaseTerms.map(([title]) => title)).toContain(
      "Maintenance and security",
    );
    const unavailable = renderToStaticMarkup(
      <PurchaseSummary service="appointments" />,
    );
    expect(unavailable).toContain("not available to purchase");
    expect(unavailable).not.toContain('type="checkbox"');
  });
  it("demonstrates existing deployed website layouts with sample data, without save/publish actions", () => {
    const html = renderToStaticMarkup(<WebsiteDemo />);
    expect(html).toContain('data-variant="header-minimal"');
    expect(html).toContain('data-variant="menu-list"');
    expect(html).toContain("premium preview");
    expect(html).toContain("no draft or ownership is saved");
    expect(html).not.toContain("action=");
  });
  it("keeps legal operator details explicitly unconfirmed and all five editable drafts present", () => {
    expect(Object.keys(legalPages)).toHaveLength(5);
    for (const page of Object.values(legalPages)) {
      expect(page.sections.length).toBeGreaterThan(2);
      expect(JSON.stringify(page)).toMatch(/REQUIRED|CONFIRM/);
    }
  });
});
describe("public URLs and contact configuration", () => {
  it("requires a configured HTTPS origin rather than assuming the intended domain is owned", () => {
    expect(publicOrigin({})).toBeUndefined();
    expect(
      publicOrigin({ SERVQOO_PUBLIC_ORIGIN: "https://owned.example/" }),
    ).toBe("https://owned.example");
    for (const bad of [
      "http://servqoo.com",
      "https://user:pass@servqoo.com",
      "https://servqoo.com/path",
      "https://servqoo.com/?x=1",
      "javascript:alert(1)",
    ])
      expect(publicOrigin({ SERVQOO_PUBLIC_ORIGIN: bad })).toBeUndefined();
  });
  it("hides missing and invalid contact methods without inventing email or phone", () => {
    expect(publicContacts({})).toEqual({ email: null, whatsapp: null });
    expect(
      publicContacts({
        SERVQOO_CONTACT_EMAIL: "bad\r\nBCC: private",
        SERVQOO_WHATSAPP_NUMBER: "javascript:alert(1)",
      }),
    ).toEqual({ email: null, whatsapp: null });
    expect(
      publicContacts({
        SERVQOO_CONTACT_EMAIL: "owner@example.test",
        SERVQOO_WHATSAPP_NUMBER: "60123456789",
      }),
    ).toEqual({
      email: "owner@example.test",
      whatsapp: `https://wa.me/60123456789?text=${encodeURIComponent("Hi SERVQOO, I would like to know more about your services.")}`,
    });
  });
  it("prepares canonical metadata and sitemaps without indexing preview environments", () => {
    vi.stubEnv("SERVQOO_PUBLIC_ORIGIN", "https://owned.example");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(
      publicMetadata("Pricing", "Preview", "/pricing").alternates?.canonical,
    ).toBe("https://owned.example/pricing");
    expect(
      sitemap().find((s) => s.url === "https://owned.example/pricing"),
    ).toBeTruthy();
    expect(JSON.stringify(robots())).toContain("/dashboard");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(sitemap()).toEqual([]);
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(publicMetadata("Pricing", "Preview", "/pricing").robots).toEqual({
      index: false,
      follow: false,
    });
  });
  it("leaves redirects off until explicitly configured and never redirects Auth/API/tenant routes", () => {
    expect(
      marketingRedirects({ SERVQOO_PUBLIC_ORIGIN: "https://owned.example" }),
    ).toEqual([]);
    const redirects = marketingRedirects({
      SERVQOO_PUBLIC_ORIGIN: "https://owned.example",
      SERVQOO_REDIRECT_FROM_HOSTS:
        "old.example,owned.example,https://evil.example",
    });
    expect(redirects).toHaveLength(publicPaths.length);
    expect(
      redirects.every(
        (r) => r.destination === "https://owned.example" + r.source,
      ),
    ).toBe(true);
    expect(
      redirects.some((r) => /dashboard|auth|api|sites/.test(r.source)),
    ).toBe(false);
    expect(redirects[0].has[0].value).toBe(String.raw`old\.example`);
  });
});
