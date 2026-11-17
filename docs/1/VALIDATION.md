# Validation report

Ticket: https://github.com/doctor-ew/floating-browser/issues/1

Date: 2026-11-13. Delivery: local-only companion app, isolated `nightshift/1` branch.

## Automated checks

- `cd nostalgia-tv && npm test`: PASS, 19 tests. Covers the complete seeded catalog, safe source parsing, host/scheme/credential rejection, Archive derivative deduplication, incomplete/malformed metadata, dependency errors and timeout cancellation, ordered channel rotation, multipart grouping, opt-in bumpers, unknown-duration/source exclusions, deterministic boundary/wraparound offsets, whole-catalog JSON validation, persistence failures, native-player lifecycle, late YouTube cancellation, official-player playlist configuration, video advancement, embed errors, and state events.
- `cd nostalgia-tv && npm run check`: PASS. Syntax validation for the application modules and local server.
- `git diff --check`: PASS.
- Local HTTP checks: the document, stylesheet, four application modules, and source guide return 200 with their expected content types. Missing paths, `.git/config`, and encoded parent traversal return 404. POST to the read-only server returns 405.

The player tests use local stand-ins for video and YouTube API objects. Archive adapter failure tests inject the fetch boundary. Those tests prove application behavior under the stated conditions, not external provider availability. No Postman simulation or cloud mock was deployed.

## Live provider checks

- Archive metadata: real response contains the supplied Dukes episode's compatible H.264 MP4 derivative and a positive runtime. The metadata response permits cross-origin browser reads.
- Archive media: a real byte-range request returns 206 and video/mp4. `npm run verify:archive` reproduces item import, catalog validation, positive runtime, and the byte-range check. This is separate from browser decoding.
- Archive browser playback: in a separate Chrome Guest preview, Tune in live played the Dukes episode; the actual picture and PLAYING state were visible. No native Floating Browser operation was used.
- Archive browser import: submitting the supplied item URL into its existing show fetched metadata and produced the expected duplicate-source message without adding another encode/item.
- Supplied YouTube compilation: the official player loaded and returned an embed restriction. The application displayed the restriction, Retry/Skip/original-source controls, and kept the unchecked item outside the live rotation.
- Official YouTube integration probe: Google's documented sample https://www.youtube.com/watch?v=M7lc1UVf-VE played using the same adapter. A real PLAYING event and duration of approximately 22:23 were observed. The temporary QA catalog item was removed afterward and is not shipped in the seed.
- Tubi: the supplied G.I. Joe episode is represented as an outbound original-page link, never as an embeddable or scheduled stream. Tubi continuous playback was not tested or claimed.

## Interface checks

The local app was inspected in a separate Chrome Guest window because the in-app browser access host was unavailable. Checked initial watch/guide layout, all-channel catalog count, channel switching, honest empty-channel messaging, persisted channel selection after reload, source dialog, unsupported-source rejection, live Archive duplicate detection, the YouTube error and success paths, catalog search for Mighty Orbots, and cleanup of disposable test data. A 300% Chrome zoom check exercised the compact responsive layout; this was not device emulation. The final preview was returned to Drew TV with the shipped catalog and no active media playback.

Native Swift source and the installed native browser app were not changed or operated for this task.

## Remaining limits

- Only one live-schedulable episode is included initially. The other show entries are a curated wish list, not a claim of complete available seasons. Add checked sources to expand rotation.
- The supplied Saturday Morning Simulator compilation cannot currently play embedded in the observed environment; its original YouTube link remains available.
- Real YouTube playlist playback was not exercised with a user-supplied playlist. Its configuration, delegated advancement, and exclusion from the station clock were tested with local API stand-ins.
- Import/export format and persistence have automated coverage. The system file-picker/download flow was not exercised end-to-end.
- The full final tests were not rerun across multiple browser engines. Live scheduling is best effort around provider ads and autoplay policy.
- This is not a production deployment, upstream PR, merge, or completed Nightshift pipeline.

## Nightshift result and fallback

Nightshift was invoked first as requested. After model-free project initialization it created the isolated worktree and selected product authoring, but the product worker failed preflight with `INPUT_RESOLUTION_REQUIRED: provide_explicit_ticket_list` (exit 71). The failure occurred before product authoring; no Nightshift spec or gate-pass receipt existed. Direct implementation followed the user's explicit fallback authorization. The factory failure evidence remains retained in local Git metadata, and `.nightshift/1.md` records the direct-delivery status without converting the failed factory result to a pass.
