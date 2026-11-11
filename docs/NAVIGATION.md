# Merchant workspace navigation

The sidebar is configured in `src/lib/dashboard-navigation.ts`, rendered by `src/components/dashboard/sidebar.tsx`, and shared across the dashboard. It distinguishes implemented destinations from Coming Soon entries. Planned destinations have neither a working view nor an href; the module route loader returns 404 for unregistered paths.

| Module               | Implemented destinations                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Overview             | `/dashboard`                                                                                                                            |
| Maintenance          | `/dashboard/maintenance/menu`, `/dashboard/maintenance/categories`, `/dashboard/maintenance/business`                                   |
| Café Website Builder | `/dashboard/website/editor`, `/dashboard/designs`, `/dashboard/website/pages`, `/dashboard/website/media`, `/dashboard/website/publish` |
| Component Store      | `/dashboard/components/browse`, `/dashboard/components/purchases`                                                                       |
| Settings             | `/dashboard/settings/general` (existing workspace appearance controls)                                                                  |

The original `/dashboard` and `/dashboard/designs` entry points remain. Existing dashboard views are reused: category management uses the current menu/category manager; Business Information uses the existing business-settings form; Preview / Publish uses the current editor and preview modal. My Purchases displays the existing free/demo-unlocked collection. Complete Themes is disabled until implemented.

POS / Cashier, Orders, Employee Management, Table Management, Promotions, Complete Themes, Staff Permissions, Subscription & Billing, and Security are clearly labeled Coming Soon. No business operations or payment integrations were added.

## Routing and state

`src/app/dashboard/[...module]/page.tsx` resolves only registered, implemented module URLs. New modules can replace individual branches with their own route/layout/server loaders later. The dedicated gallery route retains precedence.

Normal sidebar clicks keep the current workspace mounted and update the URL using the browser history API. Modified clicks and opening links in another tab use normal deep links. Back/forward navigation restores the selected view. The shared dashboard layout/provider retains unsaved layouts, design history, selected page and appearance when route segments or server data refresh. None of this changes draft saving or publishing semantics.

## Roles and permissions

The verified membership role supplies navigation capabilities on the server. Current `owner` and `editor` roles retain existing access. Unknown role policies grant no capabilities. Visibility metadata is intended as a foundation, not a substitute for server authorization.

`authorize(merchantId, capability?)` retains existing tenant membership checks and supports an optional capability check. Implemented module deep-link loaders use it; existing mutation authorization remains unchanged. When adding staff roles or more restrictive policies, apply the required capability to **every** relevant server action/API as well as its loader. The Staff Permissions screen and role-assignment workflow are not implemented by this navigation change.

## Sidebar behavior

- Business name and configured homepage-header logo appear at the top; a café mark is the fallback.
- The sidebar accepts optional real outlet data and a change handler. No outlet control is shown until those are supplied; there is no simulated outlet switch.
- Groups collapse independently. The current destination and its parent group are highlighted; Design Gallery stays directly accessible inside the builder group.
- Navigation scrolls independently of the identity and account footer.
- The mobile drawer has a backdrop, close button, Escape handling, focus containment/return, and a hidden offscreen state that cannot receive keyboard focus.
- General settings reuses the existing light/dark appearance state and links to business information.

No schema changes or database migration are required.
