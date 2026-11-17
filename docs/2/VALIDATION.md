# Bulk seeding validation

Date: 2026-11-13. Scope: companion web app and local Node server only.

## Automated checks
- `npm test`: 23 passing tests, including additive batch approval, duplicates across shows and within batches, omitted rows, atomic failure, unknown runtimes, source/size validation and provider title ordering.
- Server integration check: foreign origins and cross-site fetch requests return 403; unsupported source URLs return 400 before starting discovery; POST returns 405; module serving and path confinement remain functional.
- `npm run check` and `git diff --check`: passed.

## Live provider discovery
- Installed `yt-dlp` supports the metadata-only flags used by discovery. Public search results supplied the starter candidates' IDs, titles, channel names and runtimes.
- The new local API returned the official He-Man upload's episode metadata without downloading media.
- The official Hasbro Pulse [Transformers collection](https://www.youtube.com/playlist?list=PLD3dCMp2WHixUHTv2TETDETzoB148KoPy) returned 90 individual videos. This count describes the observed playlist, not a claim that it contains every series episode.

## Browser observations
Chrome Guest was used for isolated testing. Its storage is not the user's normal browser profile.
- Discovery displayed a 90-row review with parsed season and episode fields; approval saved 90 entries.
- A subsequent starter pack approval added four entries and skipped one duplicate. It included missing More Than Meets the Eye parts 2 and 3 from separate public uploads.
- Replacing an unsuitable G.I. Joe candidate and importing the revised starter pack added one entry and skipped four duplicates.
- Catalog entries persisted through refresh. Preview and approval did not replace the original Archive/Tubi catalog items.
- Official YouTube players reached actual `PLAYING` state for [He-Man: The Cosmic Comet](https://www.youtube.com/watch?v=04jAfMfrp8c), [Transformers: More Than Meets the Eye, Part 1](https://www.youtube.com/watch?v=Y1ujpoDlgRU) and [G.I. Joe: The Cobra Strikes](https://www.youtube.com/watch?v=6ca6XHgFdrQ).
- An earlier G.I. Joe candidate, [Amusement Park of Terror](https://www.youtube.com/watch?v=9PfiA1wWaBo), returned metadata but failed in the embedded player. It was removed from the shipped starter pack. The test profile retains that unchecked trial item outside the live schedule.

## Limits
The other discovered videos were not individually played. Metadata and observed playback are separate checks; starter-pack sources remain unverified until playback succeeds in the user's browser. Provider availability can change. No native browser launch/restart, upstream PR, merge or production deployment occurred. Only the owned companion Node server was restarted to enable the new API. The original local URL remains http://127.0.0.1:4173.

## Execution
Direct implementation used the user's authorized fallback. The Nightshift launcher failure from issue #1 remains recorded in that issue's delivery artifacts; no new factory success is claimed.
