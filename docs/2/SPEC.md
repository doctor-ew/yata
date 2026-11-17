# Drew TV bulk playlist seeding

## Objective
Implement issue [#2](https://github.com/doctor-ew/floating-browser/issues/2): stage public source metadata for review and add approved episodes without replacing a user's catalog.

## User workflow
1. Open **Seed playlists +** in the collection tools.
2. Select a destination show and enter up to ten Archive item or YouTube video/playlist URLs, one per line. Alternatively, load the supplied cartoon starter pack.
3. Discover episodes and review each title, show assignment, season, episode number and multipart group. Clear the inclusion checkbox to omit an entry. Season zero denotes unknown ordering.
4. Approve selected entries. Existing source URLs, including duplicates within the batch, are skipped across all shows. Other catalog data and settings are preserved.

## Components
- `nostalgia-tv/src/bulk.mjs` introduces `youtubeEpisodes` for metadata normalization and `mergeBatch` for validated, additive approval.
- `nostalgia-tv/youtube-metadata.mjs` introduces `discoverYouTube`. It runs installed `yt-dlp` through a shell-free child process with configuration files disabled and media downloads disabled.
- `GET /api/youtube?url=…` is a new loopback-only discovery endpoint. It accepts only URLs normalized by the existing source parser, rejects foreign browser origins/fetch contexts, and exposes no cross-origin permission.
- `nostalgia-tv/src/starter-pack.mjs` contains five public official-channel candidates: He-Man's The Cosmic Comet, G.I. Joe's The Cobra Strikes and Transformers' More Than Meets the Eye parts 1–3. Titles and durations come from public YouTube metadata checked on 2026-11-13. This is a reviewable additive pack, not an automatic local-storage migration.

## Bounds and failure behavior
YouTube discovery permits one active request, a 45-second process timeout, an 8 MB output limit and at most 200 videos per link. Reading a 201st entry rejects the entire oversized playlist rather than silently truncating it. A preview holds at most 1,000 episodes. Upstream failures are reported per source; successful sources remain available for explicit partial approval. Missing tools, inaccessible metadata and timeouts have actionable messages. Closing the dialog does not approve a batch.

Existing catalog validation and storage write must succeed before the catalog is replaced. Missing runtime stays null. YouTube metadata does not verify embedded playback: imported videos stay outside live rotation until the official player's successful playback event supplies runtime. Archive items use the existing public MP4 metadata importer. Archive collection search/recursive collection expansion and Tubi series enumeration are outside this iteration; paste individual Archive item links or add Tubi links through the source editor.

## Attribution and execution
Preserve upstream MIT attribution. No native browser changes or automation. No upstream pull request, merge or production deployment. Continue directly under the user's existing fallback authorization after the Nightshift launcher blocker recorded for issue #1; do not label the failed factory run as successful.
