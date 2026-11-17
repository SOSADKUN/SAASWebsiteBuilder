import type { MerchantCapability } from "./merchant-capabilities";
import {
  businessModules,
  defaultModuleKeys,
  moduleReadable,
  type BusinessType,
  type ModuleState,
} from "./business-modules";
export type DashboardView =
  | "Overview"
  | "Menu Manager"
  | "POS / Cashier"
  | "Orders"
  | "Website Settings"
  | "Website Editor"
  | "Pages"
  | "Media Library"
  | "Preview / Publish"
  | "General Settings"
  | "Contact SERVQOO"
  | "Subscription & Billing"
  | "Business Modules";
// A module store is discovery/configuration, not a payment checkout.
export type NavigationItem = {
  id: string;
  label: string;
  view?: DashboardView;
  href?: string;
  requires?: MerchantCapability;
  comingSoon?: boolean;
  moduleKey?: string;
};
export type NavigationGroup = {
  id: string;
  label: string;
  icon: "maintenance" | "website" | "store" | "settings";
  children: NavigationItem[];
};
export const primaryNavigation: NavigationItem[] = [
  {
    id: "overview",
    moduleKey: "overview",
    label: "Overview",
    view: "Overview",
    href: "/dashboard",
    requires: "workspace:view",
  },
  {
    id: "pos",
    moduleKey: "pos",
    label: "POS / Cashier",
    view: "POS / Cashier",
    href: "/dashboard/pos",
    requires: "pos:operate",
  },
  {
    id: "orders",
    moduleKey: "kitchen_queue",
    label: "Orders",
    view: "Orders",
    href: "/dashboard/orders",
    requires: "orders:view",
  },
];
export const navigationGroups: NavigationGroup[] = [
  {
    id: "maintenance",
    label: "Maintenance",
    icon: "maintenance",
    children: [
      {
        id: "menu",
        moduleKey: "catalog",
        label: "Menu Management",
        view: "Menu Manager",
        href: "/dashboard/maintenance/menu",
        requires: "menu:view",
      },
      { id: "employees", label: "Employee Management", comingSoon: true },
      { id: "tables", label: "Table Management", comingSoon: true },
      { id: "promotions", label: "Promotions", comingSoon: true },
      {
        id: "business",
        moduleKey: "business",
        label: "Business Information",
        view: "Website Settings",
        href: "/dashboard/maintenance/business",
        requires: "business:view",
      },
    ],
  },
  {
    id: "website",
    label: "Website Builder",
    icon: "website",
    children: [
      {
        id: "editor",
        moduleKey: "website",
        label: "Website Editor",
        view: "Website Editor",
        href: "/dashboard/website/editor",
        requires: "website:view",
      },
      {
        id: "pages",
        moduleKey: "website",
        label: "Pages",
        view: "Pages",
        href: "/dashboard/website/pages",
        requires: "website:view",
      },
      {
        id: "media",
        moduleKey: "media",
        label: "Media Library",
        view: "Media Library",
        href: "/dashboard/website/media",
        requires: "media:view",
      },
      {
        id: "publish",
        moduleKey: "website",
        label: "Preview / Publish",
        view: "Preview / Publish",
        href: "/dashboard/website/publish",
        requires: "website:view",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    children: [
      {
        id: "general",
        moduleKey: "settings",
        label: "General",
        view: "General Settings",
        href: "/dashboard/settings/general",
        requires: "settings:view",
      },
      { id: "permissions", label: "Staff Permissions", comingSoon: true },
      {
        id: "billing",
        moduleKey: "settings",
        label: "Subscription & Billing",
        view: "Subscription & Billing",
        href: "/dashboard/settings/billing",
        requires: "settings:view",
      },
      { id: "security", label: "Security", comingSoon: true },
      {
        id: "contact-servqoo",
        moduleKey: "settings",
        label: "Contact SERVQOO",
        view: "Contact SERVQOO",
        href: "/dashboard/settings/contact",
        requires: "settings:view",
      },
    ],
  },
];
navigationGroups.push({
  id: "store",
  label: "Store",
  icon: "store",
  children: [
    {
      id: "modules",
      moduleKey: "settings",
      label: "System Services",
      view: "Business Modules",
      href: "/dashboard/store/modules",
      requires: "settings:view",
    },
    {
      id: "website-designs",
      label: "Website Designs",
      view: undefined,
      href: "/dashboard/store/designs",
      requires: "website:view",
      moduleKey: "website",
    },
  ],
});
export const navigationItems = [
  ...primaryNavigation,
  ...navigationGroups.flatMap((g) => g.children),
];
export function navigationForView(view: string) {
  return navigationItems.find((item) => item.view === view);
}
export function navigationForPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return navigationItems.find(
    (item) => item.href === normalized && !item.comingSoon,
  );
}
export function groupForView(view: string) {
  return navigationGroups.find((group) =>
    group.children.some((item) => item.view === view),
  );
}
export function isNavigationVisible(
  item: NavigationItem,
  capabilities: readonly MerchantCapability[],
) {
  return !item.requires || capabilities.includes(item.requires);
}

export function merchantNavigation(
  type: BusinessType = "cafe",
  states?: readonly ModuleState[],
) {
  const active =
    states ??
    defaultModuleKeys(type).map((key) => ({
      key,
      enabled: true,
      entitled: true,
      expiresAt: null,
    }));
  const visible = (item: NavigationItem) => {
    if (item.comingSoon) {
      const planned = businessModules.find(
        (module) => module.key === (item.moduleKey ?? item.id),
      );
      return !planned || planned.suggestedTypes.includes(type);
    }
    return !item.moduleKey || moduleReadable(item.moduleKey, active);
  };
  return {
    primary: primaryNavigation.filter(
      (item) => !item.comingSoon && visible(item),
    ),
    groups: navigationGroups.map((g) => ({
      ...g,
      children: g.children.filter((item) => !item.comingSoon && visible(item)),
    })),
  };
}
