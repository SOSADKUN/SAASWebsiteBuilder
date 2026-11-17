import { describe, it, expect } from "vitest";
import {
  businessModules,
  businessType,
  businessTypes,
  defaultModuleKeys,
  moduleAccess,
  type ModuleState,
} from "../src/lib/business-modules";
import {
  capabilitiesForRole,
  roleHasCapability,
} from "../src/lib/merchant-capabilities";
import { merchantNavigation } from "../src/lib/dashboard-navigation";
import { dashboardLoadPlan } from "../src/lib/dashboard-load-plan";
import { initialBusinessLayout } from "../src/lib/business-defaults";
const cafe: ModuleState[] = defaultModuleKeys("cafe").map((key) => ({
  key,
  enabled: true,
  entitled: true,
  expiresAt: null,
}));
describe("multi-industry foundation", () => {
  it("uses existing renderers without inventing booking or cake forms", () => {
    const cafe = initialBusinessLayout("Cafe", "cafe");
    const salon = initialBusinessLayout("Salon", "hair_salon");
    expect(cafe.find((s) => s.key === "menu-grid")?.visible).toBe(true);
    expect(salon.find((s) => s.key === "menu-grid")?.visible).toBe(false);
    expect(salon.find((s) => s.key === "ordering-cta")?.visible).toBe(false);
    expect(salon.find((s) => s.key.startsWith("hero"))?.settings.title).toBe(
      "Salon",
    );
    expect(salon.map((s) => s.key)).toEqual(cafe.map((s) => s.key));
  });
  it("keeps old merchants on cafe defaults and rejects prototype keys", () => {
    expect(businessType(undefined)).toBe("cafe");
    expect(businessType("__proto__")).toBe("cafe");
    expect(Object.keys(businessTypes)).toHaveLength(6);
    for (const key of ["pos", "fnb_orders", "kitchen_queue"])
      expect(defaultModuleKeys("cafe")).toContain(key);
  });
  it("does not present product POS as default salon service checkout", () => {
    expect(defaultModuleKeys("hair_salon")).not.toContain("pos");
    const nav = merchantNavigation("hair_salon");
    expect(
      nav.groups
        .flatMap((group) => group.children)
        .some((item) => item.id === "tables"),
    ).toBe(false);
    expect(nav.primary.some((n) => n.id === "pos")).toBe(false);
    expect(nav.primary.find((n) => n.id === "appointments")).toBeUndefined();
    expect(
      merchantNavigation("bakery").primary.find(
        (n) => n.id === "cake_preorders",
      ),
    ).toBeUndefined();
  });
  it("validates registry dependencies and marks unbuilt features unavailable", () => {
    expect(new Set(businessModules.map((m) => m.key)).size).toBe(
      businessModules.length,
    );
    for (const m of businessModules)
      for (const dependency of m.dependencies)
        expect(businessModules.some((d) => d.key === dependency)).toBe(true);
    for (const key of [
      "appointments",
      "cake_preorders",
      "inventory",
      "services",
    ])
      expect(moduleAccess(key, cafe)).toBe("coming_soon");
  });
  it("separates activation, license, expiry and dependency states", () => {
    expect(moduleAccess("pos", cafe)).toBe("enabled");
    expect(
      moduleAccess(
        "pos",
        cafe.map((m) => (m.key === "pos" ? { ...m, enabled: false } : m)),
      ),
    ).toBe("disabled");
    expect(
      moduleAccess(
        "pos",
        cafe.map((m) => (m.key === "pos" ? { ...m, entitled: false } : m)),
      ),
    ).toBe("not_entitled");
    expect(
      moduleAccess(
        "pos",
        cafe.map((m) =>
          m.key === "pos" ? { ...m, expiresAt: "2000-01-01" } : m,
        ),
      ),
    ).toBe("expired");
    expect(
      moduleAccess(
        "pos",
        cafe.filter((m) => m.key !== "catalog"),
      ),
    ).toBe("disabled");
  });
  it("filters navigation by configuration independently of business type", () => {
    const disabled = cafe.map((m) =>
      m.key === "pos" ? { ...m, enabled: false } : m,
    );
    expect(
      merchantNavigation("cafe", disabled).primary.some((n) => n.id === "pos"),
    ).toBe(false);
    expect(
      merchantNavigation("hair_salon", cafe).primary.some(
        (n) => n.id === "pos",
      ),
    ).toBe(true);
  });
  it("restricts new roles without losing explicitly migrated editor access", () => {
    expect(roleHasCapability("editor", "pos:operate")).toBe(false);
    expect(roleHasCapability("legacy_editor", "pos:operate")).toBe(true);
    expect(roleHasCapability("cashier", "menu:manage")).toBe(false);
    expect(roleHasCapability("kitchen", "pos:operate")).toBe(false);
    expect(roleHasCapability("manager", "modules:manage")).toBe(false);
    expect(roleHasCapability("owner", "modules:manage")).toBe(true);
    expect(capabilitiesForRole("__proto__")).toEqual([]);
  });
  it("isolates operational and settings loaders from website dependencies", () => {
    const owner = capabilitiesForRole("owner");
    expect(dashboardLoadPlan("Orders", owner, cafe)).toEqual([]);
    expect(dashboardLoadPlan("Website Settings", owner, cafe)).toEqual([]);
    expect(dashboardLoadPlan("Business Modules", owner, cafe)).toEqual([]);
    expect(dashboardLoadPlan("POS / Cashier", owner, cafe)).toEqual([
      "products",
      "categories",
    ]);
    expect(dashboardLoadPlan("Media Library", owner, cafe)).toEqual(["media"]);
    expect(dashboardLoadPlan("Overview", owner, cafe)).not.toContain("media");
    expect(dashboardLoadPlan("Website Editor", owner, cafe)).toContain(
      "entitlements",
    );
  });
  it("never loads builder datasets for cashier, kitchen or unknown roles", () => {
    for (const role of ["cashier", "kitchen", "unknown"])
      expect(
        dashboardLoadPlan("Website Editor", capabilitiesForRole(role), cafe),
      ).toEqual([]);
    expect(
      dashboardLoadPlan("Overview", capabilitiesForRole("kitchen"), cafe),
    ).toEqual([]);
  });
});
