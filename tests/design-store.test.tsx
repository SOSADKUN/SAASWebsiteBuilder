import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/server/design-actions", () => ({ unlockDesignDemo: vi.fn() }));
import {
  WebsiteDesignStore,
  designStoreCategories,
} from "../src/components/designs/website-design-store";
import { definitions } from "../src/lib/models";
import {
  navigationForPath,
  groupForView,
} from "../src/lib/dashboard-navigation";
import { dashboardLoadPlan } from "../src/lib/dashboard-load-plan";
const business = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test business",
  slug: "test",
  description: "",
  address: "",
  hours: "",
  phone: "",
};
const offers = definitions.map((d) => ({
  key: d.key,
  active: true,
  premium: d.premium,
  price: d.price * 100,
}));
function render(items = offers) {
  return renderToStaticMarkup(
    <WebsiteDesignStore
      business={business}
      products={[]}
      offers={items}
      unlocked={[]}
      canUnlock={true}
      onOpenEditor={() => {}}
      onRefresh={() => {}}
    />,
  );
}
it("resolves a dedicated store route under Store", () => {
  expect(navigationForPath("/dashboard/store/designs")).toMatchObject({
    view: "Website Designs",
    requires: "website:view",
    moduleKey: "website",
  });
  expect(groupForView("Website Designs")?.id).toBe("store");
});
it("offers every deployed category, a section preview and vertical design choices", () => {
  expect(designStoreCategories).toEqual([
    ...new Set(definitions.map((d) => d.type)),
  ]);
  const html = render();
  expect(html).toContain('aria-label="Section categories"');
  expect(html).toContain('aria-label="Header designs"');
  expect(html).toContain("Live section preview");
  expect(html).toContain("Centered");
  expect(html).toContain("Masthead &amp; navigation");
  expect(html).toContain("Demo store");
  expect(html).toContain("Open editor");
});
it("does not offer inactive designs or pretend an empty category is purchasable", () => {
  const html = render(offers.map((o) => ({ ...o, active: false })));
  expect(html).toContain("No designs are currently available");
  expect(html).not.toContain("Unlock for demo");
});
it("loads only preview/catalog/ownership datasets, respecting website access", () => {
  const states = [
    { key: "website", enabled: true, entitled: true, expiresAt: null },
  ];
  expect(
    dashboardLoadPlan("Website Designs", ["website:view"], states),
  ).toEqual(["products", "catalog", "prices", "entitlements"]);
  expect(dashboardLoadPlan("Website Designs", [], states)).toEqual([]);
  expect(dashboardLoadPlan("Website Designs", ["website:view"], [])).toEqual(
    [],
  );
});
