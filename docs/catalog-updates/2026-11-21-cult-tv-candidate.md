# Cult television catalog candidate

Status: prepared locally; not published. Checked November 21, 2026 (America/New_York).

The viewer approved the expanded cult science-fiction, Adult Swim and British comedy lineup. The live registry manifest read during preparation identifies base revision `58df4f1d5116507d4cb0950ad40249f7dcec0e6ff714d72e2f5c659a8911bcd0`: 341 shows, 13,983 entries and 14,297 sources. The candidate preserves every original show record unchanged and adds the following selections.

| Show | Channel | Entries | Provider reference |
| --- | --- | ---: | --- |
| Firefly | Science Fiction | 14 | [Archive collection](https://archive.org/details/episode-1-serenity) |
| Garth Marenghi’s Darkplace | Comedy | 6 | [Archive collection](https://archive.org/details/garthmarenghisdarkplace_202507) |
| Lexx | Science Fiction | 61 | [Archive collection](https://archive.org/details/lexx-1996-tvshow) |
| The Mighty Boosh | Comedy | 20 | [Archive collection](https://archive.org/details/truth.-seekers2024) |
| Look Around You | Comedy | 14 | [Archive collection](https://archive.org/details/lookaroundyoutv) |
| The IT Crowd | Comedy | 24 | [Season one](https://archive.org/details/the-it-crowd-s-01-e-01), [two](https://archive.org/details/the-it-crowd-s-02-e-01), [three](https://archive.org/details/the-it-crowd-s-03-e-01), [four](https://archive.org/details/the-it-crowd-s-04-e-01) |
| Spaced | Comedy | 14 | [Archive collection](https://archive.org/details/spacedtvshow) |
| Metalocalypse | Comedy | 60 | [Official Adult Swim pages](https://www.adultswim.com/videos/metalocalypse) |
| Frisky Dingo | Comedy | 24 | [Official Adult Swim pages](https://www.adultswim.com/videos/frisky-dingo) |
| Monty Python’s Flying Circus | Comedy | 43 | [Archive collection](https://archive.org/details/monty-pythons-flying-circus-s-3-e-08-the-cycli) |

The 17 other suggested titles are already present in the observed live catalog: Space: 1999, The Venture Bros., Farscape, Red Dwarf, Blake’s 7, UFO, Harvey Birdman, Sealab 2021, Space Ghost Coast to Coast, Aqua Teen Hunger Force, The Brak Show, Home Movies, The Oblongs, Mission Hill, The Tick (animated), Dr Katz and The Critic. Their records are unchanged.

## Evidence and limits

`data/cult-tv-selections.json` stores the selected records, exact source URLs, durations and source checks. All 196 selected Archive files returned successful byte-range responses with video content types. These checks establish accessible video bytes, not complete decoding, language verification, distribution rights or all-region playback. The official Adult Swim collection pages supplied 84 non-expired episode records with `auth: false`; those links open externally through the existing provider integration. Their sources remain `unverified` because playback was not tested. No TV video files were downloaded into the repository.

Firefly follows the selected collection’s numbered story order, starting with Serenity. Boosh concert videos, unrelated Luxury Comedy material, Darkplace extras, the Look Around You pilot, edited IT Crowd copies and unidentified DVD segments are excluded. These are selected entries, not verified complete-series claims.

Snuff Box remains pending because the inspected DVD-derived filenames do not establish episode identity. Toast of London remains pending because current metadata retrieval for YouTube video `FHQ9EbWh0K0` failed with proxy HTTP 403. Neither is represented by a placeholder show.

## Reproduce and publish

Fetch the immutable base snapshot referenced by the [live registry manifest](https://doctorew.com/tv/data/published-catalog-v3-manifest.json). Verify that its revision still matches the selection pack, then run:

```sh
node scripts/cult-tv-candidate.mjs /private/path/base.json /private/path/candidate.json
```

The script verifies the base SHA-256, refuses duplicate shows and an existing output file, validates the catalog and checks preservation of original records. If the live base changed, review and rebase the additions rather than replacing the new live catalog.

Prepared candidate SHA-256: `1cea11aaff048d0a1e7e22bd554360bbb83ecb1ae2e5b6c8fed259faf2734786`. Result: 351 shows, 14,263 entries and 14,577 sources; 5,382,714 bytes. The candidate itself remains outside the repository. Publication must use the existing registry publisher and its concurrency review, with any required compatible feed reviewed alongside it. No manifest or immutable published snapshot was changed. Artwork has not been prepared for these additions.

Fresh checks: candidate schema validation; exact comparison of all 341 original show records; 27 tests across catalog-publisher, catalog-integrity and catalog-feeds; static build (530 files); candidate script syntax check. Physical-device and full provider playback tests were not run.

## Publication and Pensieve handoff

This cloud environment has no `aws` executable or configured cloud secret bindings. Live publication was not attempted. No release was shipped, so changelog and latest published release notes remain unchanged. Finish publication with the owner’s authorized publishing environment, read back the live manifest and snapshot, and record the resulting publication receipt before describing these additions as live.

Pensieve MCP is configured but `codex mcp list` reports `Not logged in`. No remote memory update was sent or confirmed. After successful publication, send a concise sourced update to the remote YATA pool using this report, the repository commit and the live publication receipt; retain its remote receipt. This file is a local handoff, not a completed remote update. Credentials must stay outside repository files and memories.

Monty Python follow-up: the user requested Monty Python after the original candidate review. The live manifest still matched the pinned base. Added 43 individually numbered Flying Circus source files after fresh byte-range checks; uploader-truncated titles are retained without inventing missing text. This is a partial selection, not all 45 episodes. Films, compilations and mixed television recordings are excluded. Rebuilt candidate schema validation and exact preservation of the 341 original records passed. This content-only follow-up did not rerun the earlier static build or 27 tests. Publication and Pensieve blockers above remain unresolved.
