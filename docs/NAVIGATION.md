# SERVQOO navigation

The [Project Guide](SERVQOO_PROJECT_GUIDE.md) is the current architecture/access reference. Navigation is declared in `src/lib/dashboard-navigation.ts`, rendered by the shared sidebar and checked again by protected loaders/actions.

| Area            | Current destinations                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Public          | `/`, `/pricing`, `/demo`, `/purchase`, `/contact`, `/legal/[document]`                                            |
| Overview        | `/dashboard`                                                                                                      |
| System Services | `/dashboard/pos`, `/dashboard/orders`; owner plus opens `/dashboard/store/modules`                                |
| Maintenance     | `/dashboard/maintenance/menu`, `/dashboard/maintenance/business`                                                  |
| Website Builder | `/dashboard/website/editor`, `/dashboard/website/pages`, `/dashboard/website/media`, `/dashboard/website/publish` |
| Settings        | `/dashboard/settings/general`, `/dashboard/settings/billing`                                                      |

Actual hrefs come from the registry; these are not independent permission grants. Module/capability checks control implemented links. Enabled expired paid modules retain authorized history/fulfillment with a History badge, while new operations require current service authorization. Coming Soon modules remain discoverable but cannot activate. Unknown destinations return 404.

Normal navigation uses App Router navigation and per-view server datasets. The shared layout/provider retains working editor state and unload warnings across routes. POS drafts are tab/company-scoped sessionStorage, not cross-device/offline orders. The mobile drawer retains focus/escape/return handling.

Store → Website Designs opens `/dashboard/store/designs`, with category browsing, live layout previews and the existing demo unlock flow. `/dashboard/designs` redirects there. Settings → Contact SERVQOO opens `/dashboard/settings/contact`.

Old category-management links redirect to Menu Management; legacy `/dashboard/components/...` links still redirect to Website Editor. Keep those convention routes and legacy renderers. Retained gallery components also support visual fixtures; absence from the sidebar is not proof of dead code.

Owner, manager, legacy_editor, editor, cashier, kitchen and technician capabilities differ; owner/editor are not equivalent. Unknown roles get none. Staff invitations/role editing and outlets remain future work. Visibility is not a substitute for server authorization. See [current role boundaries](SERVQOO_PROJECT_GUIDE.md#4-authentication-and-company-model).
