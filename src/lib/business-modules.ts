import type { MerchantCapability } from "./merchant-capabilities";
import { servicePricing } from "./service-pricing";
export const businessTypes = {
  cafe: "Cafe / Restaurant",
  bakery: "Cake Shop / Bakery",
  nail_salon: "Nail Salon",
  hair_salon: "Hair Salon",
  beauty_studio: "Beauty Studio",
  other: "Other",
} as const;
export type BusinessType = keyof typeof businessTypes;
export function businessType(value: unknown): BusinessType {
  return typeof value === "string" && Object.hasOwn(businessTypes, value)
    ? (value as BusinessType)
    : "cafe";
}
type ModuleDefinition = {
  key: string;
  name: string;
  description: string;
  category: "core" | "fnb" | "bakery" | "salon" | "future";
  availability: "implemented" | "demo" | "coming_soon";
  optional: boolean;
  dependencies: string[];
  capabilities: MerchantCapability[];
  accessPolicy: "free" | "paid";
  trialEligible: boolean;
  entitlement: "included" | "separate";
  suggestedTypes: BusinessType[];
  navigation?: { label: string; href?: string };
  demoMonthlyPrice: number | null;
};
const all = Object.keys(businessTypes) as BusinessType[];
function module(
  key: string,
  name: string,
  category: ModuleDefinition["category"],
  capabilities: MerchantCapability[],
  dependencies: string[] = [],
  optional = true,
): ModuleDefinition {
  return {
    key,
    name,
    description: `${name} for your business workspace.`,
    category,
    availability: "implemented",
    optional,
    dependencies,
    capabilities,
    accessPolicy: category === "core" ? "free" : "paid",
    trialEligible: category !== "core",
    entitlement: "included",
    suggestedTypes: all,
    demoMonthlyPrice: servicePricing[key] ?? null,
  };
}
function future(
  key: string,
  name: string,
  category: ModuleDefinition["category"],
  suggestedTypes: BusinessType[],
  dependencies: string[] = [],
): ModuleDefinition {
  return {
    ...module(key, name, category, ["modules:manage"], dependencies),
    availability: "coming_soon",
    entitlement: "separate",
    accessPolicy: "paid",
    trialEligible: false,
    suggestedTypes,
    navigation: { label: name },
    demoMonthlyPrice: servicePricing[key] ?? null,
  };
}
export const businessModules: readonly ModuleDefinition[] = [
  module(
    "overview",
    "Dashboard Overview",
    "core",
    ["workspace:view"],
    [],
    false,
  ),
  module(
    "business",
    "Business Management",
    "core",
    ["business:view"],
    [],
    false,
  ),
  module("settings", "Settings", "core", ["settings:view"], [], false),
  module("website", "Website Builder", "core", ["website:view"], [], false),
  module(
    "media",
    "Media Management",
    "core",
    ["media:view"],
    ["website"],
    false,
  ),
  module("catalog", "Product / Menu Catalog", "core", ["menu:view"], [], false),
  {
    ...module(
      "pos",
      "Product POS / Cashier",
      "fnb",
      ["pos:operate"],
      ["catalog"],
    ),
    description:
      "Product pickup checkout: cash or unpaid. Not salon service checkout.",
    suggestedTypes: ["cafe", "bakery"],
    navigation: { label: "POS / Cashier", href: "/dashboard/pos" },
  },
  {
    ...module("fnb_orders", "F&B Orders", "fnb", ["orders:view"], ["catalog"]),
    suggestedTypes: ["cafe", "bakery"],
  },
  {
    ...module(
      "kitchen_queue",
      "Staff / Kitchen Queue",
      "fnb",
      ["orders:view"],
      ["fnb_orders"],
    ),
    suggestedTypes: ["cafe", "bakery"],
    navigation: { label: "Orders", href: "/dashboard/orders" },
  },
  future("customers", "Customer Management", "core", all),
  future("employees", "Employee Management", "core", all),
  future("qr_ordering", "QR Ordering", "fnb", ["cafe"], ["fnb_orders"]),
  future("tables", "Table Management", "fnb", ["cafe"], ["fnb_orders"]),
  future(
    "cake_preorders",
    "Cake Pre-orders",
    "bakery",
    ["bakery"],
    ["catalog"],
  ),
  future(
    "cake_customization",
    "Cake Customization",
    "bakery",
    ["bakery"],
    ["cake_preorders"],
  ),
  future(
    "pickup_schedule",
    "Pickup Scheduling",
    "bakery",
    ["bakery"],
    ["cake_preorders"],
  ),
  future(
    "production_calendar",
    "Production Calendar",
    "bakery",
    ["bakery"],
    ["cake_preorders"],
  ),
  future(
    "cake_deposits",
    "Deposit and Balance Tracking",
    "bakery",
    ["bakery"],
    ["cake_preorders"],
  ),
  future("appointments", "Appointment Booking", "salon", [
    "nail_salon",
    "hair_salon",
    "beauty_studio",
  ]),
  future("services", "Service Catalog", "salon", [
    "nail_salon",
    "hair_salon",
    "beauty_studio",
  ]),
  future(
    "staff_availability",
    "Staff Availability",
    "salon",
    ["nail_salon", "hair_salon", "beauty_studio"],
    ["employees"],
  ),
  future(
    "appointment_calendar",
    "Appointment Calendar",
    "salon",
    ["nail_salon", "hair_salon", "beauty_studio"],
    ["appointments"],
  ),
  future(
    "service_checkout",
    "Service Checkout / Deposits",
    "salon",
    ["nail_salon", "hair_salon", "beauty_studio"],
    ["services"],
  ),
  future("inventory", "Inventory", "future", all),
  future("loyalty", "Loyalty", "future", all),
  future("multi_outlet", "Multi-outlet", "future", all),
  future("analytics", "Analytics", "future", all),
];
export type ModuleState = {
  key: string;
  available?: boolean;
  enabled: boolean;
  entitled: boolean;
  expiresAt: string | null;
  entitlementSource?: "free" | "trial" | "verified" | "none";
};
export function defaultModuleKeys(type: BusinessType) {
  return businessModules
    .filter(
      (m) =>
        m.availability === "implemented" &&
        (!m.optional ||
          ["website", "media", "catalog"].includes(m.key) ||
          ["cafe", "bakery"].includes(type)),
    )
    .map((m) => m.key);
}
export function moduleAccess(
  key: string,
  states: readonly ModuleState[],
  now = Date.now(),
  visited = new Set<string>(),
): "enabled" | "disabled" | "coming_soon" | "not_entitled" | "expired" {
  const definition = businessModules.find((m) => m.key === key);
  if (!definition || definition.availability === "coming_soon")
    return "coming_soon";
  if (visited.has(key)) return "disabled";
  const state = states.find((s) => s.key === key);
  if (state?.available === false) return "disabled";
  if (!state?.enabled) return "disabled";
  if (!state.entitled) return "not_entitled";
  if (state.expiresAt && Date.parse(state.expiresAt) <= now) return "expired";
  const next = new Set(visited).add(key);
  return definition.dependencies.every(
    (dep) => moduleAccess(dep, states, now, next) === "enabled",
  )
    ? "enabled"
    : "disabled";
}
export const capabilityModules: Partial<Record<MerchantCapability, string>> = {
  "workspace:view": "overview",
  "reports:view": "overview",
  "settings:view": "settings",
  "modules:manage": "settings",
  "website:view": "website",
  "website:manage": "website",
  "marketplace:use": "website",
  "media:view": "media",
  "media:manage": "media",
  "menu:view": "catalog",
  "menu:manage": "catalog",
  "pos:operate": "pos",
  "orders:view": "kitchen_queue",
  "orders:manage": "kitchen_queue",
  "business:view": "business",
  "business:manage": "business",
};

// Retained reads/fulfilment are distinct from authorization to start operations.
// Missing configuration or disabled implementations still fail closed.
export function moduleReadable(
  key: string,
  states: readonly ModuleState[],
  visited = new Set<string>(),
): boolean {
  const def = businessModules.find((m) => m.key === key);
  const state = states.find((m) => m.key === key);
  if (
    !def ||
    def.availability !== "implemented" ||
    !state?.enabled ||
    state.available === false ||
    visited.has(key)
  )
    return false;
  const next = new Set(visited).add(key);
  return def.dependencies.every((dep) => moduleReadable(dep, states, next));
}
