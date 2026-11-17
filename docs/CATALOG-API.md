# Catalog and card data boundaries

## Public read contracts

The UI renders remote data rather than a per-title card list. Public feeds are served as versioned JSON over the existing CDN; they do not require an AI call or privileged key.

| Feed | Purpose | Validation |
| --- | --- | --- |
| data/published-catalog-manifest.json | Selects immutable authoritative TV catalog | Existing SHA-256 snapshot, schema, byte and count checks |
| data/library-art.json | TV card artwork, dates, genres and provider references | Version 1, bounded records, safe artwork asset paths and reference URLs |
| data/arcade-games.json | Game identities and controls for TV/native companion routing | Version 1, unique IDs, finite categories/statuses; no launch URLs |
| /arcade/launcher-catalog.json | Arcade cards and supported runtime configuration | Same game identities, bounded text, relative asset/player paths and supported engines |

src/catalog-feeds.mjs and src/arcade-catalog.mjs validate these public feeds. Games and their launch targets do not come from model output. A data publisher can update supported titles/cards without replacing the APK. Adding a new provider, player engine or protocol still requires reviewed application code.

Network metadata is preferred. Validated cached data is used on failure; generated bundled game metadata remains the compatibility fallback. Public cache persistence is best effort, not guaranteed durable storage. An invalid network response cannot overwrite the validated cache. Media and game assets are separate from card data and may still require connectivity.

Native public reads use the limited YataCatalog bridge. Artwork references resolve to hosted assets, allowing new card art without an APK replacement. The bridge does not expose arbitrary URLs, credentials, catalog writes or private-server access.

## Publication

scripts/build-game-index.mjs produces the TV/native metadata feed and Arcade launcher feed from reviewed source catalogs. Both feeds use the same game identities. Existing curated modules are generation inputs and offline compatibility data, not the primary live-card authority. Publish JSON alongside assets; do not advertise an installed game before its reviewed runtime assets are deployed.

TV publication remains the conditional immutable-snapshot workflow. Never replace the shared catalog with a generated factory seed. Public artwork/feed updates do not grant administrative write privileges.

## Private providers: future work

Plex and bring-your-own libraries require authenticated provider adapters and private account/library scope. The current public feed must never contain private libraries, access tokens, private server URLs or viewing credentials. Rendering should consume normalized card data while playback preserves the originating provider/item identity. Do not identify an item by title alone.

Private cache records must be scoped to the authenticated account/library and cleared or isolated on sign-out. The public cache helper in this release is not a private-provider cache or authentication implementation. Availability, caption support and playback capabilities belong to provider adapters. A native Swift client can consume the same versioned data contracts with its own transport, cache and playback adapters.

## Ratings and store readiness

The optional contentRating field in data/library-art.json retains system, value, region, scope, sourceUrl, sourceName and verifiedOn. The initial supported contract is US-TV, US jurisdiction and series scope. Five original Disney series have sourced TV-Y7 references. Missing ratings display Unrated; numerical review scores are not content classifications. Series references do not classify archived edits, compilations or commercial breaks.

These labels are informational. Profile restrictions across discovery, schedules, queues, companions and direct links remain future work. App-store questionnaires and per-title ratings serve different purposes. See GitHub issue 12; no parental-control or store-compliance claim is made by this data-feed change.
