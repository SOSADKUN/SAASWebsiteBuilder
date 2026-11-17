import {
  businessModules,
  businessTypes,
  moduleAccess,
  type BusinessType,
  type ModuleState,
} from "./business-modules";
import { servicePricing } from "./service-pricing";
export { servicePricing } from "./service-pricing";
export type SystemService = {
  key: string;
  name: string;
  description: string;
  modules: string[];
  implemented: boolean;
  featured: boolean;
  trialEligible: boolean;
  monthlyPrice: number | null;
  suggestedTypes: BusinessType[];
  compatibleTypes: BusinessType[];
  dependencies: string[];
};
export const systemServices: readonly SystemService[] = businessModules
  .filter(
    (module) =>
      module.optional && !["fnb_orders", "kitchen_queue"].includes(module.key),
  )
  .map((module) => ({
    key: module.key,
    name:
      module.key === "staff_availability"
        ? "Staff Scheduling"
        : module.key === "inventory"
          ? "Advanced Inventory"
          : module.name,
    description: module.description,
    modules: [module.key],
    implemented: module.availability === "implemented",
    featured:
      module.availability === "implemented" ||
      ["cake_preorders", "appointments", "staff_availability"].includes(
        module.key,
      ),
    trialEligible: module.trialEligible,
    monthlyPrice: servicePricing[module.key] ?? null,
    suggestedTypes: module.suggestedTypes,
    compatibleTypes: Object.keys(businessTypes) as BusinessType[],
    dependencies: module.dependencies.filter(
      (key) => businessModules.find((m) => m.key === key)?.optional,
    ),
  }))
  .concat([
    {
      key: "orders",
      name: "Orders & Kitchen Queue",
      description:
        "Send pickup tickets to your staff screen and track preparation.",
      modules: ["fnb_orders", "kitchen_queue"],
      implemented: true,
      featured: true,
      trialEligible: true,
      monthlyPrice: servicePricing.orders,
      suggestedTypes: ["cafe", "bakery"],
      compatibleTypes: Object.keys(businessTypes) as BusinessType[],
      dependencies: ["pos"],
    },
  ])
  .sort((a, b) => Number(b.implemented) - Number(a.implemented));
export function formatServicePrice(sen: number) {
  return `RM${(sen / 100).toFixed(2)}`;
}
export function recommendedServices(type: BusinessType) {
  return systemServices
    .filter(
      (s) =>
        s.implemented && s.trialEligible && s.suggestedTypes.includes(type),
    )
    .map((s) => s.key);
}
export function serviceModules(keys: readonly string[]) {
  return [
    ...new Set(
      keys.flatMap(
        (key) => systemServices.find((s) => s.key === key)?.modules ?? [],
      ),
    ),
  ];
}
export function selectedServices(states: readonly ModuleState[]) {
  return systemServices
    .filter(
      (s) =>
        s.implemented &&
        s.modules.every((key) => states.find((m) => m.key === key)?.enabled),
    )
    .map((s) => s.key);
}
export function estimatedMonthly(keys: readonly string[]) {
  return [...new Set(keys)].reduce(
    (total, key) =>
      total + (systemServices.find((s) => s.key === key)?.monthlyPrice ?? 0),
    0,
  );
}
export function selectionError(
  keys: readonly string[],
  type: BusinessType,
  states?: readonly ModuleState[],
): string | null {
  if (new Set(keys).size !== keys.length) return "Choose each service once.";
  for (const key of keys) {
    const service = systemServices.find((s) => s.key === key);
    if (!service?.implemented || !service.trialEligible)
      return "Coming soon services cannot be enabled.";
    if (!service.compatibleTypes.includes(type))
      return `${service.name} is not compatible with this business.`;
    const missing = service.dependencies.filter((dep) => !keys.includes(dep));
    if (missing.length)
      return `${service.name} requires ${missing.map((dep) => systemServices.find((s) => s.key === dep)?.name ?? dep).join(", ")}.`;
  }
  if (states) {
    const selected = serviceModules(keys);
    const candidate = states.map((state) => ({
      ...state,
      enabled:
        selected.includes(state.key) ||
        !businessModules.find((m) => m.key === state.key)?.optional,
    }));
    if (selected.some((key) => moduleAccess(key, candidate) !== "enabled"))
      return "A selected service needs a valid license or an enabled dependency.";
  }
  return null;
}
export function addService(
  keys: readonly string[],
  key: string,
  visited = new Set<string>(),
): string[] {
  if (visited.has(key)) return [...keys];
  const service = systemServices.find((s) => s.key === key);
  if (!service?.implemented) return [...keys];
  let result = [...new Set([...keys, key])];
  const next = new Set(visited).add(key);
  for (const dep of service.dependencies)
    result = addService(result, dep, next);
  return result;
}
// Mutation-time policy: preserve historical source-less queues for reading,
// but require an order source for new activation or source removal.
export function configurationSourceError(
  states: readonly ModuleState[],
  changed: readonly string[],
  enabling: boolean,
) {
  const orders = systemServices.find((service) => service.key === "orders")!;
  const changingQueue =
    enabling && changed.some((key) => orders.modules.includes(key));
  const changingSource = changed.includes("pos");
  if (
    orders.modules.some((key) => states.find((m) => m.key === key)?.enabled) &&
    (changingQueue || changingSource)
  ) {
    const missing = orders.dependencies.find(
      (key) => moduleAccess(key, states) !== "enabled",
    );
    if (missing)
      return `${orders.name} requires ${systemServices.find((service) => service.key === missing)?.name ?? missing}.`;
  }
  return null;
}
