# Cult television publication receipt

Published November 21, 2026 (America/New_York), November 22 at 04:02 UTC. The user explicitly authorized publication. This receipt supersedes the unpublished status and AWS blocker in the [preparation report](2026-11-21-cult-tv-candidate.md); that report preserves source coverage and prior checks.

The live catalog adds 10 shows and 280 selected entries: Firefly (14), Garth Marenghi’s Darkplace (6), Lexx (61), The Mighty Boosh (20), Look Around You (14), The IT Crowd (24), Spaced (14), Metalocalypse (60), Frisky Dingo (24), and Monty Python’s Flying Circus (43). The resulting feeds contain 351 shows, 14,263 entries and 14,577 source records. All original show records are unchanged. Snuff Box and Toast of London remain pending.

## Publication evidence

AWS Core confirmed account `432230020714`, identity `arn:aws:iam::432230020714:user/doctorew`. The repository's `frozenCatalog`, `publicationDiff`, registry evolution checks and compatibility projection prepared the two publications. The normalized publication hashes differ from the preliminary candidate hash because the publisher applies station defaults. No generated seed replaced a published catalog.

Both immutable snapshots were uploaded with `If-None-Match: *`, then downloaded through the public site and checked against their SHA-256 revisions before either manifest changed. Both S3 manifests were read immediately before publication and updated conditionally against their observed ETags. Public manifest/snapshot readback subsequently verified both revisions and counts.

| Feed | Prior revision | Published revision | S3 manifest version |
| --- | --- | --- | --- |
| [Current registry](https://doctorew.com/tv/data/published-catalog-v3-manifest.json) | `58df4f1d5116507d4cb0950ad40249f7dcec0e6ff714d72e2f5c659a8911bcd0` | `e6fcea9b8cae48d80eb226b34651cd79a0b4f96ccc15cbf73a659f77bf978023` | `SSGFbyQmur24yrYcYFFNIAUSgiql1jWM` |
| [Older-app compatibility](https://doctorew.com/tv/data/published-catalog-v2-manifest.json) | `cb97a023280590b08a6c2f3dcb026685dbabefb91ae93cf1d3f7e1391f08b6cc` | `debb988b968553916da0cc54770dcc127c2dc000ee366b346d4391d829e4bf00` | `suJwxN5Fym.K7scw4gap7qqQea9TnezV` |

CloudFront accepted manifest invalidation `I890RR2D1PYWNLCWPSLH10G3UF`. The deployed release-notes module was confirmed identical to the repository base before a conditional update; the change adds this content update to the existing 0.8.22 notes. Release-note invalidation: `I5UM1FIWBVT161EX4HYFQXT0V9`. No APK, app version bump or other application code was deployed.

## Fresh verification

- Reviewed canonical and compatibility diffs: 10 added shows, 280 added entries/sources; no removed or changed original records.
- Public readback of both uploaded snapshots and both published feeds: SHA-256 and counts verified.
- Catalog publisher, integrity and feed tests: 27 passed.
- Release-note tests: 2 passed after aligning the changelog text with the release-note entry.
- Static build: 530 files. No full playback, regional availability or physical-device tests were run.

The preparation checks established accessible video bytes for 196 Archive sources and official non-authenticated episode metadata for 84 Adult Swim external links. They do not establish full decoding, distribution rights or all-region playback. No new show artwork is included.

## Pending remote Pensieve receipt

Pensieve's cloud connection remains unauthenticated. No remote receipt has been confirmed. Retain this sourced message for retry:

> YATA published 10 cult TV additions and 280 selected entries, including Firefly, Metalocalypse, Darkplace and 43 Flying Circus episodes. Current and older-app feeds now have 351 shows, 14,263 entries and 14,577 sources; original records are unchanged. Current revision e6fcea9b8cae48d80eb226b34651cd79a0b4f96ccc15cbf73a659f77bf978023; compatibility debb988b968553916da0cc54770dcc127c2dc000ee366b346d4391d829e4bf00. Public hashes/counts verified; 27 catalog tests, 2 release-note tests and static build passed. No new APK. Snuff Box and Toast of London remain pending. Sources: live manifests above, data/cult-tv-selections.json, this publication receipt and the repository publication commit.
