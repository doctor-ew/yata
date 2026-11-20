# Release evidence: 0.8.22

Date: 2026-11-20. Issue: https://github.com/doctor-ew/yata/issues/46. Source review: https://github.com/doctor-ew/yata/pull/50.

## Published behavior

Channel 11 is Game Shows. Twenty existing vintage collections moved into it. Nickelodeon game shows remain on Nick. Navigation, Guide, Library filters, mix switches, remix controls and sharing use the registry in the accepted catalog snapshot. Compatible ordinary additions can subsequently be published as data; new platform/provider capabilities or unsupported schema changes still require a build.

| Inventory | Before | After |
| --- | ---: | ---: |
| Collections | 340 | 340 |
| Catalog entries | 13,971 | 13,971 |
| Sources | 14,285 | 14,285 |

No media or retrieval documents were ingested by this migration. Game-show collections remain partial selections. Sale of the Century and Tic Tac Dough are not included in this wave.

## Publication receipts

- Canonical v3 feed snapshot: `148dbf46033cfa5b57db375a1bb3f3398fb73f9fb47f64b2af5cf8822dbcbc42`.
- Older-app v2 feed: `ca1cd2358f793fb8a8cfb5366de8c2c500674ac12a171a212e27aad44242a395`, unchanged. Its projected snapshot hashes identically to the pre-migration inventory and contains no registry or new channel identifier.
- Canonical publication completed with `compatibilityPending: false` and `cacheInvalidationPending: false`.
- Website upload completed at `2026-11-20T16:41:50.453Z`; CloudFront invalidation `I1P2UA94AB61HPUUGIOES0IOQ7`.
- Existing analytics collector received a revision-checked code-only update with verified rollback archive. No new AWS resources, IAM policies or capacity were created.

## Validation

- 306 Node tests passed, including generic future-channel addition, finite metadata rejection, scheduling, settings/queue migration, sharing, compatibility projection, stale writes and partial publication success.
- Nine analytics Python tests and 43 retrieval/deployment Python tests passed. Retrieval tests used the existing boto3-enabled development environment.
- Syntax checks passed for application modules, new registry/migration/publication modules, native bundle builder and modified deployment/ingestion Python files.
- Browser tests passed for live registry addition, affected controls, opt-out/all-on semantics, persistence, corrupt refresh rejection and phone-width layout; channel builder; existing mix controls; authoritative public catalog and protected owner publication; IndexedDB writer conflict and read-only recovery.
- Production browser smoke at `https://doctorew.com/tv/#guide` showed interface `0.8.22`, ten TV guide rows, Game Shows in navigation/filter/mix/remix controls, selected label `CH 11 · GAME SHOWS · RANDOM STREAM`, and no page errors.
- The live analytics HTTP API accepted the published Game Shows dimension with status 204 and rejected an unpublished channel ID with status 400. These explicit checks used synthetic version `0.0.0`.
- A read-only live retrieval binding check validated an existing Knight Rider entry against the canonical snapshot. No embedding, ingestion or paid model call was performed.

## Android and Apple boundary

Android 0.8.22, version code 33, built successfully. The APK contains the verified canonical snapshot, ten registry definitions and twenty Game Shows collections. Its final artifact is `mobile/artifacts/YATA-0.8.22-android-debug.apk`, distributed through GitHub Releases rather than committed.

Artifact size: 40,506,635 bytes. SHA-256: `5ddaf4915ff9e330e5d89ec1fdedb13da6deda0954c4bdc7a8a49a432c1d8246`.

ADB listed no connected device, so this release was not installed or physically tested on the user's phone. Provider video decoding and background handoff were not revalidated by the metadata/browser tests.

The iOS native reader now permits the v3 manifest, and `docs/apple/TONIGHT-HANDOFF.md` covers rebuilding/syncing and testing the new reader and bundled snapshot. No Xcode, iPhone, tvOS or TestFlight build result is claimed.
