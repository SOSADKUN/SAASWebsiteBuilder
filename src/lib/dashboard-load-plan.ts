import type { MerchantCapability } from "./merchant-capabilities";
import { moduleAccess, type ModuleState } from "./business-modules";
type Dataset =
  | "pages"
  | "products"
  | "categories"
  | "entitlements"
  | "media"
  | "catalog"
  | "prices";
// A route requests only the datasets its UI consumes. No fallback to a broad loader.
export function dashboardLoadPlan(
  view: string,
  capabilities: readonly MerchantCapability[],
  states: readonly ModuleState[],
): Dataset[] {
  const can = (cap: MerchantCapability, module: string) =>
    capabilities.includes(cap) && moduleAccess(module, states) === "enabled";
  const website = can("website:view", "website");
  const catalog = can("menu:view", "catalog");
  if (["Website Editor", "Preview / Publish"].includes(view))
    return website
      ? [
          "pages",
          "products",
          "catalog",
          "prices",
          "entitlements",
          ...(can("media:view", "media") ? ["media" as const] : []),
        ]
      : [];
  if (view === "Pages") return website ? ["pages"] : [];
  if (view === "Media Library")
    return can("media:view", "media") ? ["media"] : [];
  if (["POS / Cashier", "Menu Manager"].includes(view))
    return catalog ? ["products", "categories"] : [];
  if (view === "Overview")
    return [
      ...(website
        ? ["pages" as const, "catalog" as const, "entitlements" as const]
        : []),
      ...(catalog || website ? ["products" as const] : []),
    ];
  return [];
}
