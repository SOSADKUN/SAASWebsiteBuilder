import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  systemServices,
  servicePricing,
  estimatedMonthly,
  recommendedServices,
  selectionError,
  addService,
  selectedServices,
} from "../src/lib/system-services";
import {
  defaultModuleKeys,
  type ModuleState,
} from "../src/lib/business-modules";
import { capabilitiesForRole } from "../src/lib/merchant-capabilities";
import { TrialBanner } from "../src/components/dashboard/trial-banner";
import { SystemServicePicker } from "../src/components/dashboard/system-service-picker";
vi.mock("@/server/actions", () => ({
  signOut: vi.fn(),
  startBusinessSetup: vi.fn(),
}));
import { MerchantSidebar } from "../src/components/dashboard/sidebar";
import type { SubscriptionSnapshot } from "../src/lib/subscription-policy";
const modules: ModuleState[] = defaultModuleKeys("cafe").map((key) => ({
  key,
  enabled: true,
  entitled: true,
  expiresAt: null,
}));
const subscription: SubscriptionSnapshot = {
  serverNow: "2026-11-17T00:00:00Z",
  trialStartedAt: "2026-11-10T00:00:00Z",
  trialEndsAt: "2026-11-24T00:00:00Z",
  status: "trialing",
  planName: "SERVQO",
  currentPeriodEndsAt: null,
  paymentVerifiedAt: null,
  verificationSource: null,
};
describe("System Services selection, pricing and trial presentation", () => {
  it("uses a single MYR demo catalog with the requested prices", () => {
    expect(servicePricing).toMatchObject({
      pos: 2900,
      orders: 2900,
      cake_preorders: 2900,
      appointments: 3900,
      staff_availability: 1900,
      inventory: 1900,
    });
    expect(
      estimatedMonthly(["website", "media", "catalog", "pos", "orders"]),
    ).toBe(5800);
    expect(estimatedMonthly(["pos", "pos", "orders"])).toBe(5800);
    expect(estimatedMonthly([])).toBe(0);
    expect(
      selectedServices(modules).filter((key) => key === "orders"),
    ).toHaveLength(1);
  });
  it("selects only implemented, compatible trial-eligible recommendations", () => {
    expect(recommendedServices("cafe")).toContain("pos");
    expect(recommendedServices("bakery")).toContain("orders");
    for (const type of ["nail_salon", "hair_salon", "beauty_studio"] as const) {
      expect(recommendedServices(type)).not.toContain("pos");
      expect(recommendedServices(type)).not.toContain("appointments");
    }
    for (const key of recommendedServices("cafe"))
      expect(systemServices.find((s) => s.key === key)).toMatchObject({
        implemented: true,
        trialEligible: true,
      });
  });
  it("adds dependencies and prevents removing a required order source", () => {
    const keys = addService([], "orders");
    expect(keys).toEqual(expect.arrayContaining(["orders", "pos", "catalog"]));
    expect(selectionError(keys, "cafe", modules)).toBeNull();
    expect(
      selectionError(
        keys.filter((key) => key !== "pos"),
        "cafe",
      ),
    ).toContain("requires");
    expect(selectionError([], "cafe", modules)).toBeNull();
    expect(addService([], "appointments")).toEqual([]);
  });
  it("rejects forged future, duplicate and unlicensed selections", () => {
    expect(selectionError(["appointments"], "hair_salon", modules)).toContain(
      "Coming soon",
    );
    expect(selectionError(["not-a-service"], "cafe", modules)).toContain(
      "Coming soon",
    );
    expect(selectionError(["pos", "pos"], "cafe", modules)).toContain("once");
    expect(
      selectionError(
        ["catalog", "pos"],
        "cafe",
        modules.map((m) => (m.key === "pos" ? { ...m, entitled: false } : m)),
      ),
    ).toContain("license");
    // A salon may explicitly opt into product-only retail checkout.
    expect(
      selectionError(["catalog", "pos"], "hair_salon", modules),
    ).toBeNull();
  });
  it("renders trial, near-expiry, expired and verified-paid states honestly", () => {
    const render = (snapshot: SubscriptionSnapshot) =>
      renderToStaticMarkup(
        <TrialBanner
          subscription={snapshot}
          modules={modules}
          onManage={() => {}}
        />,
      );
    expect(render(subscription)).toContain("7 days left");
    expect(render(subscription)).toContain("RM58.00/month");
    expect(render(subscription)).toContain("No automatic charges");
    expect(
      render({ ...subscription, serverNow: "2026-11-23T00:00:00Z" }),
    ).toContain("ends soon");
    expect(
      render({ ...subscription, serverNow: subscription.trialEndsAt }),
    ).toContain("Your trial has ended");
    expect(
      render({
        ...subscription,
        status: "active",
        paymentVerifiedAt: "2026-11-16T00:00:00Z",
        verificationSource: "provider",
        currentPeriodEndsAt: "2026-12-17T00:00:00Z",
      }),
    ).toBe("");
  });
  it("shows future salon services as unavailable and explains trial restrictions", () => {
    const html = renderToStaticMarkup(
      <SystemServicePicker
        type="hair_salon"
        selected={recommendedServices("hair_salon")}
        modules={modules}
        onChange={() => {}}
      />,
    );
    expect(html).toContain("Coming soon");
    expect(html).toContain('aria-label="Appointment Booking" disabled=""');
    expect(html).toContain("RM39.00");
    expect(html).toContain("Current trial/subscription editing rules apply");
    expect(html).not.toContain('href="/dashboard/appointments"');
  });
  it("shows enabled accessible services and restricts the plus action to module managers", () => {
    const render = (role: string, state = modules) =>
      renderToStaticMarkup(
        <MerchantSidebar
          businessName="Example"
          email="owner@example.test"
          view="Overview"
          open={false}
          dark={false}
          capabilities={capabilitiesForRole(role)}
          modules={state}
          onNavigate={() => {}}
          onClose={() => {}}
          onThemeToggle={() => {}}
        />,
      );
    expect(render("owner")).toContain('aria-label="Add System Services"');
    expect(render("cashier")).not.toContain('aria-label="Add System Services"');
    expect(render("cashier")).not.toContain('href="/dashboard/orders"');
    const none = modules.map((m) =>
      ["pos", "fnb_orders", "kitchen_queue"].includes(m.key)
        ? { ...m, enabled: false }
        : m,
    );
    expect(render("owner", none)).toContain(
      "No optional System Services enabled",
    );
    expect(render("owner", none)).not.toContain('href="/dashboard/pos"');
  });
});
