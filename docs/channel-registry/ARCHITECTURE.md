# Remote channel registry

## Scope

Issue: https://github.com/doctor-ew/yata/issues/46. Interface release: 0.8.22.

A compatible client reads channel definitions and show assignments from one hash-checked public catalog snapshot. Ordinary channels can subsequently be added, reordered or renamed by publishing data. Changes to native capabilities, provider support, UI behavior, registry schema or limits still require application code and, for packaged clients, a new build.

Channel 00 remains the personal lineup. Channel 03 remains the locked Arcade entry. Registry metadata cannot provide executable actions, URLs, templates, HTML or arbitrary CSS. The existing nine bootstrap identities and numbers remain stable.

## Read contract

`GET /tv/data/published-catalog-v3-manifest.json` returns a version-2 publication manifest. Required fields:

| Field | Contract |
| --- | --- |
| `version` | Integer `2` |
| `requires` | Exactly `["channel-registry-v1"]` |
| `channelIds` | Ordered unique channel IDs, matching the snapshot registry exactly; 9–32 entries |
| `revision` | SHA-256 of the exact UTF-8 snapshot bytes; 64 lowercase hexadecimal characters |
| `catalog` | Exactly `data/catalogs/{revision}.json` |
| `updatedAt` | Parseable publication date |
| `counts` | Validated show, episode and source counts matching the snapshot |

The referenced version-1 catalog adds `channelRegistry: {version: 1, channels: [...]}`. Every channel has exactly `id`, `number`, `name`, `subtitle`, `accent`, and `fallback`.

- ID: lowercase letter followed by lowercase letters, digits or hyphens; at most 32 characters. Reserved action/prototype identifiers are rejected.
- Number: unique two-digit string, excluding `00` and `03`. Bootstrap identities retain their original numbers.
- Name/subtitle: nonempty plain text, at most 80/160 characters, without control characters or angle brackets.
- Accent: six-digit hexadecimal color.
- Fallback: existing bootstrap category for older readers; ordinary channels cannot fall back to the main mix.
- The main mix is first. All bootstrap identities remain present. Published identities are append-only; their numbers and fallbacks cannot be reassigned. Names, order, subtitle and accent can change.

Show `channel` values must belong to that snapshot. Optional show `legacyChannel` records the prior bootstrap category for compatibility projection. Parsing and hashing do not install global UI definitions. The app adopts the registry only after accepting the complete snapshot, then updates navigation, guide, library filters, mix switches, remix options and sharing validation. AI offers contain the current finite show IDs and channel IDs; metadata does not grant tools.

A missing v3 pointer (`404`) falls back to the v2 pointer, then the original pointer if v2 also returns `404`. Authorization failures, unsupported capabilities, malformed data, mismatched counts and hash failures do not downgrade. Existing accepted playback/catalog state remains unchanged on a failed refresh. The owned static origin can return `403` for an absent object; deploy the v3 pointer before exposing this client. Native releases bundle an independently verified current snapshot for cold launch and local fallback.

## Preferences

No explicit mix selection means all channels, including future additions. An explicit saved subset remains a subset; a newly added channel starts unchecked. All on clears that restriction. Existing saved personal lineups/queues remain bounded and validated against the current shows. A selected show follows its authoritative channel assignment when it moves. Clocks and remix seeds remain local. Channel identifiers survive sharing and refresh; invalid registry changes cannot mutate active definitions.

## Publication and older apps

`createRegistryCatalogPublisher` publishes the canonical v3 snapshot/head and a separate projection for `data/published-catalog-v2-manifest.json`. Projection strips registry fields and maps each show to `legacyChannel` or its channel fallback. Old apps keep their existing categories and inventory. The original pre-v2 pointer remains untouched.

The first Game Shows migration moves 20 existing collections to channel 11. Nickelodeon game shows remain on Nick. No episodes or sources are added or removed. Its old-reader projection must hash identically to the current v2 snapshot before publication.

Snapshots are immutable. Each head is updated with an S3 ETag conditional write. Canonical registry and assignments are atomic within one snapshot/head; the two compatibility heads are **not** a distributed transaction. Preview pins both current revisions and the reviewed candidate hash. The CLI requires the reviewed compatibility revision; the loopback owner service retains it in the expiring review receipt. A stale head is rejected. If canonical publication succeeds and compatibility publication fails, the response reports `compatibilityPending: true`; it does not report the canonical publication as failed. Review current heads and retry the same candidate to repair compatibility. Do not rerun an obsolete candidate against a newer canonical revision.

Example, after saving a fresh authoritative input:

```sh
node scripts/migrate-channel-registry.mjs /tmp/current-catalog.json /tmp/registry-candidate.json
node scripts/publish-catalog.mjs --catalog /tmp/registry-candidate.json --dry-run
node scripts/publish-catalog.mjs --catalog /tmp/registry-candidate.json --publish \
  --expected-revision none --reviewed-revision REVIEWED_HASH \
  --compatibility-base-revision REVIEWED_V2_HASH
```

Use the actual returned revisions; `none` applies only to an absent head. `data/channel-registry.json` is the initial authoring definition, not an independent runtime authority. Future content workflows must start from the current canonical shared catalog and preserve its registry. Do not regenerate the public catalog from the seed.

## Infrastructure and analytics

Existing S3, CloudFront, Lambda and analytics guard resources are reused. There is no new database, vector index or recurring server for channel metadata. Deployment remains defined by `deploy/aws-static.json`, `scripts/catalog-publisher.mjs`, `scripts/deploy-static.mjs` and `scripts/deploy-analytics.py`. `scripts/deploy-analytics-code.py` applies a code-only update to the existing owned collector, with reviewed code hash, revision CAS and a verified rollback archive.

The anonymous collector accepts new channel dimensions only from the fixed HTTPS v3 manifest. It refuses redirects, caps the response at 8 KiB, uses a two-second request timeout and caches finite validated IDs for five minutes. On failure it retains the finite last-good set, or bootstrap IDs on a cold start. Viewer input cannot add dimensions. Existing quotas, payload limits, retention and privacy settings remain unchanged. A newly published dimension may take up to five minutes to reach a warm collector.

## Validation boundary

Unit/HTTP tests cover registry validation, side-effect-free parsing, scheduling, preferences, remix/sharing, immutable integrity, manifest mismatch, compatibility projection, stale publication and partial success. Browser integration adds a channel absent from client source while the app is open, checks every affected control and persistence, then rejects a corrupt refresh. Provider/media decoding and Apple platform behavior require separate device tests. Android build and ADB results are recorded in the release report rather than inferred from browser tests.
