# Editor design selection

Layouts are selected in Website Editor. The standalone Component Store and
Design Gallery navigation entries have been removed; their old URLs redirect to
the editor. Existing merchant entitlements are preserved by component key.

Each section's layout dropdown has a preview button and, for locked layouts, a
lock/price button. Selecting a locked design changes only the working preview.
Text, photos and colors remain editable. Save draft and Publish are disabled
while any selected design is locked or unavailable, including hidden sections.
The server independently validates the merchant, subscription, active catalog,
supported version and entitlements on every save.

The lock button opens **Demo checkout — no payment collected**. Confirming grants
the merchant an idempotent entitlement with `source = 'demo'`. It never records a
successful real payment. Existing listed USD prices retain their denomination;
POS menu prices remain MYR. This mode was explicitly requested; production payment
checkout and verified payment callbacks must replace this grant before charging
for layouts. Existing entitlements are not removed or relabeled as paid.

Publish requires the submitted layout to match the saved draft. Object key order
is normalized through the shared schema so PostgreSQL JSONB serialization does
not reject an otherwise identical draft. Revisions continue to prevent stale-tab
overwrites. Editor save errors are returned as safe messages with correlation
references rather than exposing database errors.

## Header layouts and deployment

The three current headers are a single-row minimal layout, centered branding
above a navigation row, and a two-level masthead with a separate action area.
All three use the same default palette. Header layout switches preserve colors,
text, links and images. Background and text colors are edited independently in
Section settings, including the mobile navigation palette.

New header layouts use version 3. Version 1 and 2 renderers remain available for
saved and published content; choosing **Use updated layout** or another header
in the editor is the explicit upgrade. Existing publications are not rewritten.

Before deploying, apply `drizzle/0004_header_layout_versions.sql` through the normal
migration command:

```powershell
npm.cmd run db:migrate
npm.cmd run db:check
```

The additive migration copies existing header settings-schema registrations to
version 3. It does not change page content, existing versions, prices or ownership.
The migration workflow also registers missing catalog entries on fresh databases.
No production migration or deployment is performed by local tests.

Regression tests cover preview ownership gates, hidden locked sections, custom
palettes, draft-before-publish, normalized JSONB comparison, demo authorization,
safe errors, idempotent metadata registration and retained old renderers. Browser
QA uses simulated checkout/save responses; it does not collect payments or modify
production content.
