# SERVQOO Repository Cleanup Report

17 November 2026. Repository maintenance/documentation only. No feature, authentication, database, policy, runtime configuration or dependency behavior changed. No commit/push, deployment, production inspection, migration, seed, reset, customer-data deletion or third-party message was performed.

## 1. Initial repository state

- HEAD `8b38646`; package version 0.2.3. The starting tree already contained Phase A/B/C work: **70 modified tracked files and 42 untracked files** when expanded with `--untracked-files=all`. Those changes were preserved, not reset or treated as disposable clutter.
- Before cleanup, local TypeScript, lint, all **38 test files / 271 tests** and production build passed (static generation **22/22**). Test duration was **43.86 seconds**. The existing non-fatal Vitest future config-loader warning remained.
- Examined the complete source/script/test/public file inventory, App Router/Proxy conventions, package scripts, CSS imports, registry/default asset paths, migration workflow and Markdown references. A TypeScript module-resolution scan covered **185 TS/TSX files and 448 local dependency edges**; no literal dynamic-import calls were found. Conventional routes, scripts and tests are roots, not dead files merely because they have no incoming imports.
- Reviewed the status/multi-industry/Phase 1.5/A/B/C reports against current source and focused docs. Found stale README version/4 MiB/no-Storage-key claims, outdated deployment table counts and operational availability, old owner/editor equivalence/history-navigation descriptions, and blanket subscription wording on editor saves.
- The requested `SERVQOO_PRODUCTION_MIGRATION_FIX.md` is absent. No separately named final production deployment audit was found. No missing report or production repair was invented; historical audit evidence and old deployment notes were preserved.

## 2. Files deleted

**None.** No application source, assets, fixtures, scripts, customer media, ignored development files or dependencies were deleted. Original historical locations disappear only because their documents were moved intact to the archive. Existing untracked application/migration files remain.

## 3. Files archived

The guide was created and checked for all 22 requested sections and all 28 current schema tables before moving reports. All archive moves/copies were checked with before/after SHA-256. Full digests and original locations are in the [archive index](archive/README.md).

Nine historical documents were moved unchanged:

- `SERVQO_CURRENT_STATUS.md`
- `MULTI_INDUSTRY_ARCHITECTURE.md`
- `MULTI_INDUSTRY_PHASE1_REPORT.md`
- `SERVQO_PHASE1_5_REPORT.md`
- `SERVQOO_PHASE_A_REPORT.md`
- `SERVQOO_PHASE_B_REPORT.md`
- `SERVQOO_PHASE_C_REPORT.md`
- `docs/DESIGN_PHASE.md`
- `docs/DASHBOARD-TIMEOUT.md`

Two additional byte-identical snapshots preserve previous operational notes before correction: `DEPLOYMENT_PRE_CONSOLIDATION.md` and `WORKSPACE_TROUBLESHOOTING_PRE_CONSOLIDATION.md`. The maintained runbooks remain at their original paths. No previous audit findings or phase content was overwritten in these archival copies.

Frozen reports retain their original internal path/link context; it is documented in the archive index rather than editing their contents. Active documents link to the new archive/current targets. Old report-internal relative links are not claimed to all resolve from their new directory.

## 4. Documentation consolidated

[docs/SERVQOO_PROJECT_GUIDE.md](SERVQOO_PROJECT_GUIDE.md) is the primary maintained guide. It covers product/stack/architecture/Auth, all 28 tables, business types/modules, permanent Core, explicit trials/licenses/pricing, builder/POS, image optimization/quota, feature classifications/limits, environment purposes, development/migrations/deployment/testing/security and roadmap.

README is now concise, uses SERVQOO, links to the guide and includes development/test commands and the unresolved production mismatch. DEPLOYMENT and workspace diagnostics were corrected while preserving their old versions in the archive. Navigation now describes per-view App Router loading/current capabilities. Editor docs distinguish free draft/publish from the separate demo-design unlock gate. Subscription/public/brand/POS docs link to current guidance and corrected historical locations.

No application code was changed to make documentation claims true. A newly documented audit issue is that `db:check` assumes browser SELECT on every application table. Private Storage accounting tables intentionally lack it. Do not change policies to satisfy that outdated diagnostic; assess the checker/new helper coverage separately before deployment.

## 5. Brand references and hygiene

Current README/runbook wording and the documented activation-email example use SERVQOO. The stale README v0.1 label was removed; the guide derives version from package.json. No global replacement touched runtime identifiers, URLs or migration history.

Retained intentionally: package `servqo`, internal CSS/component names, original logo paths/source, export filename, stable component keys, migration/plan data, actual existing `servqo.vercel.app` URL and runtime old-plan display normalizer. Historical archive branding remains untouched.

Existing ignore rules already cover `.env.local`/other environment files (except the required `.env.example`), node_modules, Next/npm caches, coverage, build metadata and `.design-qa`. Added ignores cover `.vercel`, root package-manager debug logs, browser reports/test output and OS metadata. No generated output was deleted or added as application source. `.env.local`, private-key file extensions, generated output and QA artifacts were not tracked in the inspected current index; this is not a Git-history/credential-security certification. Secret values were not read or included.

## 6. Candidate classification and intentionally retained files

| Candidate                                                                                     | Classification                       | Decision/evidence                                                                                                                                                   |
| --------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Historical phase/design/timeout reports                                                       | Safe to archive                      | Moved unchanged after current-guide verification; index preserves provenance                                                                                        |
| Old deployment/workspace notes                                                                | Safe to archive                      | Preserved unchanged snapshots before current runbook corrections                                                                                                    |
| Regenerable `.next`, coverage, package-manager logs/browser reports                           | Safe to remove after a scoped review | None removed; ignored where appropriate. Do not remove an active build or reset dependencies during this task                                                       |
| `.design-qa` local helpers/screenshots/certificates/reference images                          | Requires review                      | Existing user/developer artifacts may support diagnosis or contain provenance; retained. Any deletion needs explicit approval of selected paths                     |
| `scripts/inspect-entitlement-foreign-key.ts`                                                  | Requires review                      | Not an npm script but an intentional read-only metadata probe; no proof it is obsolete. Retained; no database probe run                                             |
| Unused-looking exports/error/config helpers                                                   | Requires review                      | Domain-specific behavior and tooling references do not justify merging/removal; lint has no dead-import failures. No claim of complete export-level dead-code proof |
| `src/components/designs/*`, `design-gallery.css`, visual scripts/fixtures                     | Must retain for current workflow     | Gallery fixture imports ComponentGallery -> design-preview; globals and visual server reference CSS; check-designs expects generated bundle/DevTools                |
| `public/brand/servqo-logo-source.png`                                                         | Must retain                          | Authoritative supplied artwork/provenance referenced by branding docs; runtime derivatives do not make the source disposable                                        |
| Starter images/fonts/license files                                                            | Must retain                          | Defaults, fallback renderer, fixtures/seeds, font CSS and possibly persisted layout URLs; local import absence cannot prove external JSON references absent         |
| Worker, manifest/icon assets, route/layout/loading/error/Proxy files                          | Must retain                          | Browser URL references and Next.js conventions are dependencies without ordinary imports                                                                            |
| Legacy renderers/component keys/versions                                                      | Must retain                          | Saved/published layouts resolve by persisted key/version                                                                                                            |
| SQL/schema/policies/journal/snapshots, deployment tools, tests/fixtures, lockfile/example env | Must retain                          | Explicit safety boundary and functional dependencies; byte preservation checked                                                                                     |
| Pre-existing untracked Phase A/B/C files                                                      | Must retain                          | Authorized unfinished application work, not disposable generated output                                                                                             |

No old example content was removed from seeds/defaults. It remains functional starter/demo/visual-fixture content; removing it can affect fresh onboarding or published fallback behavior. No confirmed wholly-unused source file or safe asset deletion was established.

## 7. Manual review before the final deployment audit

1. Resolve production modules-stage `42P01` against its real runtime target/journal; old suspected missing 0005/0006 remains unverified. Current full workflow applies through 0008 plus policies/catalog. No bypass/reset.
2. Update/review `db:check` private-table assumptions and coverage for newer trial/quota helpers without granting browser access. Do not treat a missing read-policy warning as permission to expose server accounting.
3. Audit role/storage/runtime privileges, demo design provenance, legal/contact/domain content, real email/device behavior and hosted performance. No paid gateway is connected.
4. Preserve existing reports, migration hashes and schema/policy source. The ignored local visual workflow is not fully self-contained on a fresh checkout and deserves a separate reproducible-browser-test task.
5. Review the entire pre-existing application diff before a release; this maintenance task neither commits it nor certifies its deployed state. Obtain explicit approval before any future destructive pruning of named local QA artifacts.

## 8. Before/after verification

| Check                                    | Before cleanup                  | After cleanup                                                                                                  |
| ---------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Automated tests                          | 38 files / 271 passed; 43.86s   | Passed, 38 files / 271 tests; 40.33s                                                                           |
| TypeScript                               | Passed                          | Passed, exit 0                                                                                                 |
| ESLint                                   | Passed                          | Passed, exit 0                                                                                                 |
| Production build                         | Passed, 22/22 static generation | Passed, exit 0; 22/22 and the same route table                                                                 |
| Whitespace/link/archive/source integrity | Recorded baseline hashes        | Passed; 55 active links/anchors, 11 archive hashes, 253 protected working-tree files/report contents unchanged |

Both runs used the existing `typecheck`, `lint`, `test -- --silent --maxWorkers=2 --testTimeout=30000` and `build` npm scripts. `git diff --check` passed. No tests were disabled and no assertions changed. Source/schema/policy/asset/test/tool/package hashes were compared with the pre-cleanup working tree, including pre-existing modifications. Archive byte hashes are checked separately. Local tests use mocks/disposable PGlite, not hosted production verification.

## 9. Compatibility and readiness

Runtime behavior should remain unchanged because maintenance edits are documentation and ignore rules only. Historical root report locations changed; active references are updated and frozen internal report links have an archive relocation note. No scripts/tests/build imports were found to depend on the old report paths. External bookmarks to repository files may need the new archive path.

The repository is organized for the **final deployment audit**, not approved for production deployment. The primary guide and retained findings make remaining work explicit. Production migration mismatch, private checker assumptions, hosted acceptance and paid/legal/domain prerequisites remain. No file in the must-retain categories should be deleted as a shortcut to release.
