// Navigation visibility is not an authorization boundary. Server authorization
// and SQL read/storage policies implement the same explicit role contract.
export const merchantCapabilities = [
  "workspace:view",
  "pos:operate",
  "orders:manage",
  "website:manage",
  "menu:manage",
  "business:manage",
  "marketplace:use",
  "settings:view",
  "website:view",
  "media:view",
  "media:manage",
  "menu:view",
  "business:view",
  "orders:view",
  "modules:manage",
  "data:export",
  "reports:view",
] as const;
export type MerchantCapability = (typeof merchantCapabilities)[number];
const operationalCapabilities: readonly MerchantCapability[] = [
  "workspace:view",
  "pos:operate",
  "orders:view",
  "orders:manage",
  "website:view",
  "website:manage",
  "media:view",
  "media:manage",
  "menu:view",
  "menu:manage",
  "business:view",
  "business:manage",
  "marketplace:use",
  "settings:view",
  "data:export",
  "reports:view",
];
export function capabilitiesForRole(
  role: string,
): readonly MerchantCapability[] {
  const roles: Record<string, readonly MerchantCapability[]> = {
    owner: merchantCapabilities,
    manager: operationalCapabilities,
    legacy_editor: operationalCapabilities,
    editor: [
      "workspace:view",
      "website:view",
      "website:manage",
      "media:view",
      "media:manage",
      "marketplace:use",
      "business:view",
    ],
    cashier: ["workspace:view", "business:view", "menu:view", "pos:operate"],
    kitchen: [
      "workspace:view",
      "business:view",
      "orders:view",
      "orders:manage",
    ],
    technician: ["workspace:view", "business:view"],
  };
  return Object.hasOwn(roles, role) ? roles[role] : [];
}
export function roleHasCapability(
  role: string,
  capability: MerchantCapability,
) {
  return capabilitiesForRole(role).includes(capability);
}
