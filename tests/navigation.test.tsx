import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  navigationItems,
  navigationGroups,
  navigationForPath,
  navigationForView,
  isNavigationVisible,
} from "../src/lib/dashboard-navigation";
import {
  capabilitiesForRole,
  roleHasCapability,
} from "../src/lib/merchant-capabilities";
vi.mock("@/server/actions", () => ({ signOut: vi.fn() }));
import { MerchantSidebar } from "../src/components/dashboard/sidebar";
describe("merchant navigation boundaries", () => {
  it("keeps existing entry routes and resolves implemented module deep links", () => {
    expect(navigationForPath("/dashboard")?.view).toBe("Overview");
    expect(navigationForPath("/dashboard/pos")?.view).toBe("POS / Cashier");
    expect(navigationForPath("/dashboard/orders")?.view).toBe("Orders");
    expect(navigationItems.some((item) => item.id === "categories")).toBe(
      false,
    );
    expect(navigationForPath("/dashboard/designs/")).toBeUndefined();
    expect(
      navigationItems.some(
        (item) => item.view === ("Component Store" as string),
      ),
    ).toBe(false);
    expect(navigationForPath("/dashboard/website/editor")?.view).toBe(
      "Website Editor",
    );
    expect(navigationForView("Website Settings")?.href).toBe(
      "/dashboard/maintenance/business",
    );
    expect(
      new Set(
        navigationItems.filter((item) => item.href).map((item) => item.href),
      ).size,
    ).toBe(navigationItems.filter((item) => item.href).length);
  });
  it("never creates links or working views for planned modules", () => {
    for (const item of navigationItems.filter((item) => item.comingSoon)) {
      expect(item.href).toBeUndefined();
      expect(item.view).toBeUndefined();
    }
    for (const path of ["/dashboard/maintenance/employees"])
      expect(navigationForPath(path)).toBeUndefined();
  });
  it("retains all existing builder destinations inside the website group", () => {
    expect(
      navigationGroups
        .find((group) => group.id === "website")
        ?.children.map((item) => item.view),
    ).toEqual([
      "Website Editor",
      "Pages",
      "Media Library",
      "Preview / Publish",
    ]);
  });
  it("uses explicit membership capabilities and denies unknown role policies", () => {
    for (const role of ["owner", "editor"])
      expect(roleHasCapability(role, "website:manage")).toBe(true);
    expect(capabilitiesForRole("unrecognized")).toEqual([]);
    expect(roleHasCapability("unrecognized", "business:manage")).toBe(false);
    expect(
      isNavigationVisible(navigationForView("Website Editor")!, [
        "workspace:view",
      ]),
    ).toBe(false);
  });
  it("renders active, collapsible navigation and clearly disabled future items", () => {
    const html = renderToStaticMarkup(
      <MerchantSidebar
        businessName="Merchant Café"
        email="owner@example.test"
        view="Website Editor"
        open={false}
        dark={false}
        capabilities={capabilitiesForRole("owner")}
        onNavigate={() => {}}
        onClose={() => {}}
        onThemeToggle={() => {}}
      />,
    );
    expect(html).toContain("Merchant Café");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("<details");
    expect(html).toContain("Coming soon");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('href="/dashboard/pos"');
    expect(html).toContain('href="/dashboard/orders"');
    expect(html).not.toContain("Category Management");
    expect(html).not.toContain("Current outlet");
  });
  it("hides protected destinations without removing the future module labels", () => {
    const html = renderToStaticMarkup(
      <MerchantSidebar
        businessName="Merchant Café"
        email="owner@example.test"
        view="Overview"
        open={false}
        dark={false}
        capabilities={["workspace:view"]}
        onNavigate={() => {}}
        onClose={() => {}}
        onThemeToggle={() => {}}
      />,
    );
    expect(html).toContain('href="/dashboard"');
    expect(html).not.toContain('href="/dashboard/designs"');
    expect(html).not.toContain('href="/dashboard/maintenance/business"');
  });
});
