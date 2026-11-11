import type { MerchantCapability } from "./merchant-capabilities";
export type DashboardView =
  | "Overview"
  | "Menu Manager"
  | "Category Management"
  | "Website Settings"
  | "Website Editor"
  | "Design Gallery"
  | "Pages"
  | "Media Library"
  | "Preview / Publish"
  | "Component Store"
  | "My Components"
  | "General Settings";
export type NavigationItem = {
  id: string;
  label: string;
  view?: DashboardView;
  href?: string;
  requires?: MerchantCapability;
  comingSoon?: boolean;
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
    label: "Overview",
    view: "Overview",
    href: "/dashboard",
    requires: "workspace:view",
  },
  { id: "pos", label: "POS / Cashier", comingSoon: true },
  { id: "orders", label: "Orders", comingSoon: true },
];
export const navigationGroups: NavigationGroup[] = [
  {
    id: "maintenance",
    label: "Maintenance",
    icon: "maintenance",
    children: [
      {
        id: "menu",
        label: "Menu Management",
        view: "Menu Manager",
        href: "/dashboard/maintenance/menu",
        requires: "menu:manage",
      },
      { id: "employees", label: "Employee Management", comingSoon: true },
      { id: "tables", label: "Table Management", comingSoon: true },
      {
        id: "categories",
        label: "Category Management",
        view: "Category Management",
        href: "/dashboard/maintenance/categories",
        requires: "menu:manage",
      },
      { id: "promotions", label: "Promotions", comingSoon: true },
      {
        id: "business",
        label: "Business Information",
        view: "Website Settings",
        href: "/dashboard/maintenance/business",
        requires: "business:manage",
      },
    ],
  },
  {
    id: "website",
    label: "Café Website Builder",
    icon: "website",
    children: [
      {
        id: "editor",
        label: "Website Editor",
        view: "Website Editor",
        href: "/dashboard/website/editor",
        requires: "website:manage",
      },
      {
        id: "designs",
        label: "Design Gallery",
        view: "Design Gallery",
        href: "/dashboard/designs",
        requires: "website:manage",
      },
      {
        id: "pages",
        label: "Pages",
        view: "Pages",
        href: "/dashboard/website/pages",
        requires: "website:manage",
      },
      {
        id: "media",
        label: "Media Library",
        view: "Media Library",
        href: "/dashboard/website/media",
        requires: "website:manage",
      },
      {
        id: "publish",
        label: "Preview / Publish",
        view: "Preview / Publish",
        href: "/dashboard/website/publish",
        requires: "website:manage",
      },
    ],
  },
  {
    id: "components",
    label: "Component Store",
    icon: "store",
    children: [
      {
        id: "browse",
        label: "Browse Components",
        view: "Component Store",
        href: "/dashboard/components/browse",
        requires: "marketplace:use",
      },
      { id: "themes", label: "Complete Themes", comingSoon: true },
      {
        id: "purchases",
        label: "My Purchases",
        view: "My Components",
        href: "/dashboard/components/purchases",
        requires: "marketplace:use",
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
        label: "General",
        view: "General Settings",
        href: "/dashboard/settings/general",
        requires: "settings:view",
      },
      { id: "permissions", label: "Staff Permissions", comingSoon: true },
      { id: "billing", label: "Subscription & Billing", comingSoon: true },
      { id: "security", label: "Security", comingSoon: true },
    ],
  },
];
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
