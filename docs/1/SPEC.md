# Personal nostalgia television station

Status: implementation specification. Ticket: https://github.com/doctor-ew/floating-browser/issues/1

## Purpose and delivery boundary

Deliver Drew TV as a separate, browser-first companion in this fork. The application supports a curated retro catalog, user-supplied media, a deterministic channel guide, live-offset playback, and playback from the beginning. It does not modify or operate the native Swift browser. Delivery is a local application and a pushed ticket branch, with no merge, upstream PR, or production deployment.

## Sources

- Repository `Sources/main.swift`, `Package.swift`, `LICENSE`, and `AGENTS.md`: the existing app is native Swift/WebKit; its license and behavior remain unchanged.
- Reference checkout `old-time-radio`: `local-api.mjs` selects public Archive MP3 files using item metadata. `src/scheduleService.mts` rotates shows, optionally interleaves commercials, and computes the current position from a fixed start time. `src/utils.mts` advances a cyclic episode iterator. No IMDb import is present. The new implementation is independently written; no radio source is copied.
- Internet Archive sample metadata: https://archive.org/metadata/the-dukes-of-hazzard-s-01-e-05-high-octane . Observed H.264 MP4 derivative: `The Dukes of Hazzard S01E05  High Octane.mp4`, duration 2954.67 seconds. Metadata response permits cross-origin reads. A one-byte media range request returned HTTP 206 with video/mp4; this is not proof of browser decoding.
- User YouTube URL: https://www.youtube.com/watch?v=RmycafPZFl8 . Public watch-page metadata returned a Saturday Morning Simulator compilation title and a duration of 33116 seconds. Initial embeddability was unverified. Browser validation subsequently returned an embed restriction; the item remains outside the live schedule, with its original YouTube link available. The catalog preserves it as a compilation rather than inventing individual episodes.
- https://developers.google.com/youtube/iframe_api_reference and https://developers.google.com/youtube/player_parameters : official player, queues, playlist support, playback events, seek, autoplay limitations, and error handling. Runtime player success must be distinguished from metadata or mocked API success.
- https://tubitv.com/tv-shows/301812/s01-e01-the-cobra-strikes : G.I. Joe miniseries episode, The Cobra Strikes. Its page returned X-Frame-Options SAMEORIGIN. It is an outbound source only.
- https://data.imdb.com/non-commercial-datasets/ : IMDb is a metadata reference. This version does not scrape IMDb or require a complete dataset download. Optional title references are user supplied and structurally validated; no IMDb IDs are invented.

## User experience

The watch view contains channel selection, clock, provider/player area, Now/Next guide, and distinct Tune in live and Start from beginning actions. Library shows every requested original and approved addition, filtered by channel and search. Shows without sources remain visible and explicitly unavailable for station playback. Sources opens an editor for adding Archive items, YouTube videos/playlists, and Tubi links. Users can remove episodes, edit metadata, optionally group adjacent multipart episodes, add explicit bumpers, and export/import a versioned JSON catalog. Optional bumpers default off. Keyboard focus, native player controls, text alternatives, and small-window layouts are required.

## Architecture and proposed files

All identifiers below are new application definitions, not claims about pre-existing files.

| File | Responsibility |
| --- | --- |
| `nostalgia-tv/index.html` | Accessible page structure and dialogs |
| `nostalgia-tv/style.css` | Responsive cable-guide visual system |
| `nostalgia-tv/src/catalog.mjs` | Curated show/channel seed and supplied sources |
| `nostalgia-tv/src/domain.mjs` | Source URL validation, Archive import, catalog validation, storage, schedule computation |
| `nostalgia-tv/src/players.mjs` | Native video and official YouTube player lifecycle, cancellation and failures |
| `nostalgia-tv/src/app.mjs` | DOM rendering, source editing, import/export, guide and playback coordination |
| `nostalgia-tv/server.mjs` | Loopback-only static development server; no API proxy or arbitrary server fetch |
| `nostalgia-tv/package.json` | Local launch and Node test/check commands; no runtime dependencies |
| `nostalgia-tv/test/*.test.mjs` | Deterministic domain and player tests |
| `nostalgia-tv/test/live-archive.mjs` | Explicit opt-in live metadata/import/range check |
| `nostalgia-tv/README.md` | Launch, source capabilities, limitations, data format and attribution |
| `docs/1/VALIDATION.md` | Commands, outcomes and remaining live-provider limits |

The app uses browser-local storage and calls the Archive metadata service directly from the browser. Media stays at its original provider. YouTube's script is loaded only on explicit playback. Tubi opens its verified original web page. No media extraction, rehosting, credentials, paid API, production service, or persistent backend is introduced.

## Data contract

A version-1 catalog contains `shows`, `settings`, and `epoch`. Each show has a unique `id`, `title`, `channel` (action or cartoons), optional `imdbUrl`, and `episodes`. Each episode has a unique `id`, `title`, positive-or-null `durationSeconds`, nonnegative integer `season` and `number`, optional `group`, `kind` (episode or bumper), and `sources`. A source has `id`, `provider` (archive, youtube, tubi), HTTPS `url`, and `availability` (verified or unverified). Verification describes a checked source, not a guarantee of current availability. Unknown runtime stays null. YouTube playlists and Tubi links are never live-scheduled. Settings contain the selected `channel` (mixed, action or cartoons) and boolean `bumpers`.

Import is bounded and validated in full before replacing any state. Reject unknown versions, oversized input, duplicate IDs, invalid types, nonpositive non-null runtime, credential-bearing URLs, unsupported schemes, wrong provider hosts/paths, and malformed reference URLs. Display imported text with textContent. Storage failure is visible and does not falsely report persistence. Export is browser initiated; no catalog upload occurs.

## Scheduling and playback

Select shows by channel, sort episodes within each show by season/number with stable source order, and rotate one episode per show. Consume adjacent episodes with the same nonempty group together, preserving chronology. Only known positive-duration episodes with a checked Archive/YouTube video source enter the live timeline. Insert an explicitly supplied checked bumper after a program/group only when enabled. Compute position by modulo over the sum of finite durations relative to the persisted epoch; exact episode boundaries advance to the next item. Empty timelines return a visible empty state, never a loop. The same catalog, settings, epoch, and time produce the same guide.

Native video uses metadata, ended, and error events. YouTube uses the official player, player error/state events, and a visible retry/play/source fallback. A disposed session cannot advance or mutate the next session. Each ended event advances once; failures never retry indefinitely. Runtime duration and successful YouTube playback can update a source's checked state. A live seek is best effort, especially around YouTube ads; never claim frame-accurate broadcast synchronization. Loading the page does not automatically start media or navigate away.

## Acceptance and validation

The 12 acceptance criteria in issue #1 are authoritative. Test scheduling boundaries, grouping, bumpers, unknown durations, empty inputs, alternate encodes, invalid URLs, failed/partial metadata, atomic JSON imports, persistence failures, player errors, and stale events. Use real local application code in tests. Provider stand-ins establish local behavior only. Run the local static server and inspect the real UI in a separate browser tab. Check live Archive metadata and a byte range separately. Record YouTube/Tubi limitations and any unavailable browser automation capability explicitly. No native-browser restart is part of QA.

## Nightshift execution receipt

Nightshift initialization succeeded and created isolated branch `nightshift/1`. The factory product worker exited 71 with `INPUT_RESOLUTION_REQUIRED: provide_explicit_ticket_list`; no product receipt or specification was generated. This was a transport/preflight failure before model authoring, not a failed product acceptance test. The user explicitly authorized direct implementation if Nightshift could not run. Direct implementation proceeds in the retained isolated branch. No Nightshift gate is represented as passed.
