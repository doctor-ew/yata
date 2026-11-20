# Family comedy and companion update

Date: 2026-11-20

## Catalog scope

| Series | Comedy entries |
| --- | ---: |
| The Kids in the Hall (1988) | 5 |
| Mr. Belvedere | 1 |
| 227 (1985) | 92 |
| Family Matters | 26 |
| A Different World (1987) | 3 |

The 127 additions extend the authoritative 269-show snapshot to 274 shows, 12,634 entries and 12,948 sources. No prior show, episode or source is changed or removed. The legacy compatibility catalog is unchanged.

Kids in the Hall uses five public, embeddable FilmRise Television full-episode uploads. A misleading Archive upload is the 2022 revival and is excluded. The original TVmaze artwork was selected manually instead of its current revival poster. A Different World uses the original 1987 series, not the 2026 reboot. Its uploader-labelled 6.17–18 recording stays intact as a combined file, with unknown guide numbers rather than invented split points.

The 227 uploader calls the collection complete, but only 92 distinct eligible MP4 episodes were selected. This update makes no complete-series claim. Family Matters alternatives are deduplicated by explicit season and episode; an unnumbered copy of the Stevil sequel is omitted. Mr. Belvedere currently has only The Counselor in this checked selection.

## Sources and validation

`data/family-comedy-discovery.json` records the exact episode/source selection, Archive item references, original-series metadata IDs and bounded endpoint checks. `scripts/family-comedy-discovery.mjs` reconstructs the candidate from reviewed provider metadata and an authoritative base snapshot. Input metadata includes family-items.json, kids-youtube.json and the listed Archive item metadata files.

All selected Archive URLs passed byte-range GET and video content-type checks. Representative frames from each Archive series were inspected. FilmRise uploads returned public metadata, episode labels, normal episode-length durations and embedding availability. These checks do not establish complete decoding, distribution permissions or future availability. Media remains with its providers. Original artwork uses TVmaze attribution in the library feed.

## Companions

Added Sandra Clark from 227 (portrayed by Jackée Harry), Steve Urkel from Family Matters and Dwayne Wayne from A Different World. These are fictional-character-inspired companions, not the actors. Original character portraits and cast identities were checked through TVmaze and linked in assets/buddy/credits.html. Public profile data contains aliases, greetings and distinct quips; backend identities and delivery prompts remain approved finite entries. No generated imagery or voice cloning is used.

## Delivery

Catalog and companion feeds update remotely on compatible existing clients, including Android 0.8.21; no new APK or Apple build is required. Reload or relaunch to fetch the current feeds. This update does not add episode descriptions to the retrieval corpus or claim new RAG coverage. Interface release remains 0.8.21.

Publication uses the reviewed base revision and immutable snapshot hash. Deployment and remote-feed readback are recorded in the associated source change and Pensieve update.

Published revision: `3a47be53385f36df928c4931920003b8c53659ff9715fe52bc4938c27f8716b3`. Live manifest/snapshot and profile/artwork/release-note feeds were read back after deployment. Client tests: 299 passed. Backend tests: 79 passed; 15 deployment tests passed in each Python mode. All 59 profile canaries reached guarded session denial without model work. No physical-device playback or live generated companion exchange is claimed by these checks.
