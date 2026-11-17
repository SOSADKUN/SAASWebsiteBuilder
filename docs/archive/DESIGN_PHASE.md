# Café design phase

## Inspection before changes

| Question                                        | Existing implementation                                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Reusable website components?                    | Nine section types, with 14 registered designs.                                                                |
| Working registry?                               | Yes: component key and version resolve to trusted React implementations.                                       |
| Separate Header/Hero/About/Menu/Gallery/Footer? | Yes, as reusable functions in one registry file.                                                               |
| Multiple variants?                              | Header, Hero, Menu and Footer; several variants differed mainly in styling. About/Gallery had one layout each. |
| Can merchants switch?                           | Yes, through the editor selector and store selection.                                                          |
| Shared editor/public renderer?                  | Yes.                                                                                                           |
| Separate settings and code?                     | Yes: validated JSONB draft/published layouts, plus normalized section records.                                 |

Missing: distinct editorial layouts, a dedicated responsive browsing/comparison experience, media-library selection in the editor, multi-photo galleries, local licensed assets, and protection against losing unsaved content while browsing designs.

## Implemented

- 19 current designs. Three headers, four heroes (including the retained classic), two About layouts, three menu layouts, two galleries, two footers, and the existing ordering/contact/location sections.
- Separate category modules in `src/components/website/sections`, with shared types, heading/button primitives, image fallback and a typed versioned registry.
- `Design Gallery` in the dashboard and the protected `/dashboard/designs` route. Actual large previews, category/search, desktop/tablet/mobile devices, side-by-side comparison, current-page preview and design-selection history.
- One in-memory working layout per page shared by the editor/gallery/store; publishing remains explicit. Variant switches retain merchant text, images, navigation, spacing, alignment, visibility and customized palettes.
- Media-library selection, bundled-photo selection, image descriptions, eyebrow text, typography choices and multi-image gallery editing.
- Local Unsplash photos with a source/license manifest and locally hosted OFL fonts. Responsive native disclosure navigation and reduced-motion support.
- Frozen version-one renderers for old snapshots. New designs use version two. Explicit selection upgrades only that draft section; database catalog registration does not rewrite merchant pages.

Run `npm run db:catalog` against an existing configured database before selecting new designs. Prices, free/premium overrides, listing availability and entitlements are preserved. The command also runs during migration/seed setup.

## Validation

34 automated tests, including tenant isolation and PostgreSQL RLS, draft/publishing behavior, preserved variant content, backward-compatible settings, registry versions and local asset validation. Production build and TypeScript checks pass. Browser checks cover 60 responsive layouts and the gallery interactions. Screenshots and the browser report are in the ignored `.design-qa` folder.

Supabase-backed sign-in, image upload and save/publish against a hosted project still require configured credentials; the browser fixture uses sample data and simulated unlock state. Selection history is retained for the current workspace session; persisted pages and entitlements remain in PostgreSQL. No ordering/POS/kitchen/payment or other business modules were added.
