# Expanded library validation

Date: 2026-11-13. Scope: companion catalog, discovery scripts, browser interface and local server.

## Automated validation
`npm test` passes 26 tests. Coverage includes whole-library merge, preservation of existing user metadata/settings, duplicate URL handling, title/number agreement for alternatives, conflicting G.I. Joe numbering, full artifact validation, every requested show having matched sources, catalog size, persisted round-trip and repeat import without added episodes or alternatives. The portable snapshot agrees with the generated manifest counts.

`npm run check` verifies all application and discovery script syntax. `git diff --check` passes. `scripts/build-library.mjs` rejects missing show coverage or a YouTube pack without completed curation. The YouTube script writes raw progress outside the importable directory and atomically publishes only after canonical title matching and schema validation.

## Source discovery
Action, cartoon and official YouTube metadata searches ran as separate delegated tasks at the user's request. Artifacts preserve collection/source evidence and exclusions. See [coverage](COVERAGE.md) for final counts and the discovery JSON files for source-specific qualifications.

- Archive cartoons: one representative MP4 per each of the 12 shows returned HTTP 206 and `video/mp4`. Additional checks covered all three newly found Centurions episodes 2–4. Representative codec probes for He-Man, G.I. Joe, Transformers, Voltron and Centurions confirmed H.264 video and AAC audio.
- Archive action: sampled Dukes, Knight Rider, A-Team and Manimal MP4 endpoints returned HTTP 206 and `video/mp4`.
- YouTube: only matched official-channel episode candidates were retained. He-Man numbering was transferred only from exact canonical Archive episode-title matches. Conflicting G.I. Joe numbering remains unknown. No new full-pack embed-playability claim is made.

Range responses and codec samples do not establish decoding or continued availability for every catalog file. A combined episode or TV movie can be one catalog item; file counts are not independent broadcast-guide totals.

## Browser observations
The Chrome Guest profile used for preview contained the prior catalog and trial entries.

- Automatic installation of the initial expansion reported 1,744 added episodes and 308 alternative sources while preserving existing entries. The profile had 1,842 catalog items after that installation; this differs from the clean portable baseline because the profile already contained trial/user additions.
- A-Team showed 95 catalog items, Knight Rider 85 and Dukes 146. These lists replaced the earlier empty/sample-only views.
- Actual native video player events reached `PLAYING · ARCHIVE` for the A-Team combined Mexican Slayride pilot and Knight Rider's combined Knight of the Phoenix pilot.
- Whole-library review initially showed 1,966 source candidates across 33 shows. Pagination advanced from page 1 to page 2 of 40 while rendering only 50 editable rows at a time. This observed count predates the final gap additions; final data is recorded in the manifest and automated snapshot check.
- Subsequent gap additions use the same validated installation path. The content revision changes so an existing installation receives them additively on refresh.

## Runtime and scope
The local URL remains http://127.0.0.1:4173. The previous terminal-bound server was no longer running; the preview now runs under the per-user macOS job `com.drew-tv.local-preview`, with logs in `/tmp/drew-tv-server.log` and `/tmp/drew-tv-server-error.log`. A loopback HTTP check returned 200.

The installed native Floating Browser app was not operated. No upstream PR, merge or production deployment was performed. Search gaps remain explicit; no claim of complete worldwide availability is made.
