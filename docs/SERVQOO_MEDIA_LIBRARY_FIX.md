# SERVQOO Media Library deletion fix

## Findings and confirmed boundaries

Investigation on 17 November 2026 used source inspection and read-only metadata queries against the locally configured database. No production files, database records, policies or migrations were changed. Vercel's environment and the historical request `3eff595d-76b0-40ea-85b4-76aea45b9c51` were not independently accessible; the exact provider response for that request cannot be reconstructed from `UNKNOWN`.

The library reads merchant-filtered `public.media_assets` through `dashboardData` in `src/server/queries.ts`. It does not list Supabase Storage objects or upload reservations. The dashboard renders each saved `url`. Deleting another image-related table does not remove these rows. An already-open browser can also retain its server snapshot until refreshed; a fresh database load still returns stale library rows if those rows remain.

The read-only reconciliation found:

| Check | Result |
| --- | ---: |
| Library records | 6 |
| `merchant-media` object metadata rows | 2 |
| Library records without object metadata | **4** |
| Objects without a corresponding merchant library record | 0 |
| Invalid merchant paths | 0 |
| URLs inconsistent with configured project/bucket/path | 0 |
| Objects with unknown byte sizes | 0 |
| Object bytes / quota snapshot used bytes | 29,380 / 29,380 |
| Absent-object reservations / reserved bytes | 0 / 0 |

This confirms stale application records in the connected database. Metadata absence does not prove what was deleted manually, when it happened, or that underlying object bytes can be recovered. A metadata row's presence also does not prove image delivery works. No live file mutation or authenticated Vercel browser acceptance was performed.

Two source defects explain poor recovery and diagnostics:

1. `removeMediaAsset` immediately rejected every returned Storage removal error, including confirmed `NoSuchKey`, before verifying absence and clearing stale metadata.
2. Removal/verification/path errors were plain `Error` objects. `workspaceErrorCode` only emits allowlisted codes, so they became `UNKNOWN`. The installed Storage SDK also **throws** non-missing failures from `exists()`, including permission/network errors; those need explicit classification.

An already-absent `media_assets` record was already an authorized no-op and remains so. A missing record does not authorize guessing a Storage path or deleting an orphaned file.

## Architecture, authorization and quota

- Validated uploads reserve capacity under a merchant lock, upload through the server-only Storage client, generate a public bucket URL and insert `media_assets`. A reservation is retained as a retry tombstone.
- Files live in `merchant-media/<merchant UUID>/<generated UUID>.<extension>`. Library names such as `test.jpg` are display names, not reliable object identifiers.
- Deletion authenticates and requires `media:manage`, selects by both asset ID and merchant ID, validates the stored merchant path and never accepts a client-supplied URL/path.
- Storage and PostgreSQL are not atomic. Storage absence is checked through the authenticated object-info SDK and then against `storage.objects` under the same merchant lock used by the upload guard. Only afterward are matching reservations and the selected library row deleted transactionally.
- Quota is derived from real object metadata plus reservations for absent objects. No byte counter is decremented. Entitlements are not changed. Failed/uncertain deletions retain records and reservations; a SQL failure after Storage deletion remains retryable.
- Existing website/product URL references are not rewritten or deleted. Deliberately deleting a used file still breaks those references, as the confirmation dialog warns. Review usage before confirming deletion; metadata-only cleanup cannot recover an already-missing image.
- Existing RLS, restrictive browser Storage policy, private accounting grants and reservation trigger are unchanged. The server credential remains server-only.

## Changes

| File | Change |
| --- | --- |
| `src/server/workspace-service.ts` | Accept confirmed missing-object removal responses, verify absence before cleanup, classify thrown/returned Storage failures and invalid paths |
| `src/lib/media-errors.ts` | Shared missing-object predicate, explicit safe error codes and user-facing messages |
| `src/lib/workspace-errors.ts` | Allowlist media error codes for existing correlation logs |
| `src/lib/storage-admin.ts` | Classify absent server Storage credential as `MEDIA_STORAGE_CONFIG` |
| `src/server/workspace-actions.ts` | Return meaningful safe messages with correlation references; preserve successful layout invalidation |
| `scripts/report-media.ts` | New read-only metadata reconciliation and quota report, with no cleanup mode |
| `tests/workspace-service.test.ts` | Missing-file, missing-record, retry, network/permission and tenant regressions |
| `tests/storage-quota.test.ts` | Missing-file reservation cleanup, nonnegative retry accounting and entitlement preservation |
| `tests/media-delete-action.test.ts` | Safe classified feedback and successful server cache invalidation |
| `tests/media-delete-dialog.test.tsx` | Success refresh callback and no false success after failure |

Codes include `MEDIA_STORAGE_CONFIG`, `MEDIA_STORAGE_DENIED`, `MEDIA_STORAGE_REMOVE`, `MEDIA_STORAGE_VERIFY` and `MEDIA_INVALID_PATH`. Logs retain static operation/stage/code, timings and random correlation IDs. Raw provider messages, filenames, URLs, keys and SQL parameters are not added to logs.

The existing UI success path hides the deleted card, closes the dialog, dispatches `servqoo:media-change` to refresh quota and calls `router.refresh()`. The server invalidates `/dashboard` layout. Failed deletion retains the card and shows the safe error/reference. No automatic cleanup on loading the library was added.

## Read-only recovery report

Run from the repository with the intended environment configured:

```powershell
# Aggregate counts only; does not print asset names, URLs or merchant IDs.
.\node_modules\.bin\tsx.cmd scripts/report-media.ts --summary

# Replace the placeholder with the affected merchant's UUID.
# Adds asset/reservation identifiers for a targeted review; still read-only.
.\node_modules\.bin\tsx.cmd scripts/report-media.ts <merchant-uuid>
```

The script uses a repeatable-read, read-only transaction. Migration/session connection selection follows existing tooling. Verify it targets the same Supabase project as Vercel before treating results as production evidence. Keep detailed identifiers private. It has no delete/release/repair flag. Usage snapshot failures are reported without attempting reconciliation.

## Targeted recovery procedure (requires an explicit deletion decision)

1. Confirm project and merchant identity; take a database backup and separately preserve any available image originals.
2. Run the merchant-scoped report and review the identified records against product images, saved/published layouts and revision references. Do not match by `test.jpg` alone.
3. If the image is still needed, retain the record while investigating recovery from an original/backup. Uploading a replacement normally creates a new URL; update only intended references through the existing editor/menu and publish where required. Do not fabricate Storage metadata.
4. If a stale record is no longer needed, after deploying the fix, the authorized owner can explicitly confirm **Delete** for that one library item. Confirmed missing files allow the stale row and its matching reservation to be removed safely. This investigation did not perform that cleanup.
5. If the row is already absent, Delete is a no-op and refreshes the UI. Storage orphans require separate path-specific review/approval; the library action intentionally cannot guess their paths.
6. If a delete returns configuration/permission/verification failure, retain data and review Vercel's server-only Storage credential/project and existing policies. Do not bypass policies or clear reservations to hide an uncertain result.
7. Rerun the scoped report, refresh the library/quota and verify remaining images and website references. No bulk SQL or Storage reset is needed.

## Validation and deployment

Checks passed: TypeScript, ESLint, production build (22/22 static pages) and 52 tests across six relevant files. The test command was `npm run test -- tests/workspace-service.test.ts tests/storage-quota.test.ts tests/media-delete-action.test.ts tests/media-delete-dialog.test.tsx tests/private-storage-check.test.ts tests/database.test.ts --maxWorkers=2 --hookTimeout=60000`. An initial concurrent build/test run hit the private-table fixture's 10-second initialization timeout; rerunning with reduced workers and a longer hook timeout passed. The existing Vitest configuration-loader warning remains non-fatal. Initial sandbox subprocess restrictions required approved subprocess execution.

Tests use mocks/disposable PGlite databases; UI callback tests do not replace full-browser Vercel acceptance. Live read-only reporting confirms metadata/quota relationships, not actual file delivery.

No migration, schema change, catalog command, new credential name or policy update is required. Commit the scoped fix only after passing checks and reviewing the surrounding working tree, which contains pre-existing work. A coordinated deployment of the matching application is appropriate; deployment itself does not clean existing broken records. Do not commit environment files or diagnostic secrets. No push/deployment was performed.
