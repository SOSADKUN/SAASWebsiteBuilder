// Navigation visibility is not an authorization boundary. Current supported
// membership roles retain their existing access. Future staff-role policies
// must also be checked by the corresponding server loaders/actions.
export const merchantCapabilities = [
  "workspace:view",
  "website:manage",
  "menu:manage",
  "business:manage",
  "marketplace:use",
  "settings:view",
] as const;
export type MerchantCapability = (typeof merchantCapabilities)[number];
export function capabilitiesForRole(
  role: string,
): readonly MerchantCapability[] {
  return role === "owner" || role === "editor" ? merchantCapabilities : [];
}
export function roleHasCapability(
  role: string,
  capability: MerchantCapability,
) {
  return capabilitiesForRole(role).includes(capability);
}
