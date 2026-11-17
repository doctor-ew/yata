# Random continuous streams

## Objective
Implement [issue #6](https://github.com/doctor-ew/floating-browser/issues/6): random episodes for an individual show, any cartoon, any action show and the full collection.

## User workflow
- **Saturday Morning**: random episodes from checked cartoon shows.
- **Action Adventure**: random episodes from checked action shows.
- **Drew TV**: random episodes from all checked shows.
- **Stream** selector or **Shuffle this show**: continuous random episodes from one show.
- **Stories per show turn**: one to three story blocks before switching shows. Multipart stories remain contiguous.
- **New mix & play**: save a fresh seed, reset the clock and start the new mix.
- **Episodes in order**: preserve the prior chronological rotation option.

The page does not autoplay on load. Existing Tune In joins the station clock. Stream configuration changes update the guide and restart an actively playing stream; paused/idle playback waits for Play unless the user explicitly requests a new mix or show shuffle.

## Settings and compatibility
Version-1 catalogs gain optional settings `rotation`, `shuffleSeed`, `storiesPerTurn` and `streamShow`. Defaults are random rotation, seed 1984, one story per turn and no show-only restriction. Validation rejects unsupported modes, invalid seeds, story counts outside 1–3 and selected shows outside the current channel. Explicit ordered-mode catalogs remain ordered. Settings persist in the existing catalog export/import and browser storage.

## Schedule
New `src/shuffle.mjs` supplies deterministic, scoped pseudorandomness and shuffled story pools. No scheduling code was copied from OTR. The inspected OTR reference uses a stable station clock, cyclic per-show generators and proportional show scheduling; Drew TV retains the clock concept and independently adds seeded randomization with equal show turns.

Each show is partitioned into chronological story blocks, with adjacent equal multipart groups kept together. Each round shuffles the show order and takes up to the selected number of distinct stories from each show. A short pool reshuffles after being consumed rather than removing that show from later rounds. Mid-turn reshuffles put stories already used in that turn last, avoiding immediate replays within a turn when enough distinct stories exist.

Rounds continue until the largest pool has been covered. The finite generated schedule then loops using the existing modulo clock. A show's pool does not repeat within its current pool cycle, but the overall schedule-loop boundary can restart a partially consumed short pool. No guarantee of repeat-free playback across that boundary is made. Show order avoids adjacent show turns where possible, including the overall seam when multiple shows are present.

The same catalog, stream settings and epoch produce the same guide/queue across refreshes. Different personal catalogs or seeds can differ; there is no new server-side synchronization. Source runtime updates can change clock positions. Playback remains best-effort around provider ads/autoplay.

## Integration
`buildSchedule` produces both random and ordered queues. Guide, Tune In and transport previous/next use that same schedule. Repeated queue occurrences retain the existing position/preceding-entry context. Navigation can remap to the nearest remaining occurrence after a catalog edit changes a predecessor. Bumper toggles use stream reconfiguration so an active cursor cannot remain anchored to an obsolete queue.

Manual selection of a particular library episode retains the existing sequential show browsing behavior. The separate **Shuffle this show** action starts the station-mode shuffled queue for that show. Unknown duration, unchecked video, playlist and outbound-only Tubi sources remain outside continuous scheduling.

## Publication
Deploy the browser-only update through the existing account-checked S3 deployment script. Catalog episode/source inventory remains unchanged. Snapshot settings and manifest distinguish unique ready items from repeated schedule slots. No native Floating Browser operation is included.
