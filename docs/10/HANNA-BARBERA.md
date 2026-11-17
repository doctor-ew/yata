# Hanna-Barbera and adventure cartoon expansion

## Scope

Implements [issue 10](https://github.com/doctor-ew/floating-browser/issues/10). Add the five previously approved adventure cartoons and eleven additional Hanna-Barbera collections to Saturday Morning and the mixed stream. The source collections supply 402 playable catalog items across 16 shows; bundled programs count as one item. This is a bounded catalog expansion, not the complete Hanna-Barbera library.

## Source coverage

| Show | Items | Reviewed collection |
| --- | ---: | --- |
| The Adventures of the Galaxy Rangers | 65 | [Source](https://archive.org/details/adventures-of-the-galaxy-rangers-complete-series-1986) |
| Visionaries: Knights of the Magical Light | 13 | [Source](https://archive.org/details/visionaries-knights-of-the-magical-light-s-01-e-13-dawn-of-the-sun-imps) |
| Space Ghost and Dino Boy | 20 | [Source](https://archive.org/details/space-ghost-and-dino-boy-complete-series-dvdrip-dolby-digital) |
| The Herculoids | 18 | [Source](https://archive.org/details/the-herculoids_202509) |
| Galtar and the Golden Lance | 21 | [Source](https://archive.org/details/Galtar) |
| Speed Buggy | 16 | [Source](https://archive.org/details/speed_buggy_Lando18) |
| Captain Caveman and the Teen Angels | 16 | [Source](https://archive.org/details/captain-caveman-and-the-teen-angels_202608) |
| Hong Kong Phooey | 16 | [Source](https://archive.org/details/hong-kong-phooey-s-01-e-08-mirror-mirror-on-the-wall-great-movie-mystery) |
| Dynomutt, Dog Wonder | 20 | [Source](https://archive.org/details/dynomutt-dog-wonder_202608) |
| Yogi Bear (original shorts) | 68 | [Source](https://archive.org/details/68-yogis-birthday-party_202109) |
| Birdman and the Galaxy Trio | 20 | [Source](https://archive.org/details/birdman-and-the-galaxy-trio) |
| Jonny Quest (1964) | 26 | [Source](https://archive.org/details/jonny-quest-e-07-calcutta-adventure) |
| Super Friends (1973) | 16 | [Source](https://archive.org/details/super-friends-1973-season-1) |
| The Flintstones | 26 | [Source](https://archive.org/details/the-flintstones-s-06-e-01-no-biz-like-show-biz) |
| The Jetsons | 24 | [Source](https://archive.org/details/the.-jetsons) |
| Wacky Races (1968) | 17 | [Source](https://archive.org/details/WackyR) |

## Interpretation and known gaps

- **The Adventures of the Galaxy Rangers:** English collection contains 65 Ep.-numbered episodes. Season zero preserves explicit source sequence without asserting broadcast seasons.
- **Visionaries: Knights of the Magical Light:** English collection contains 13 explicitly numbered season 1 episodes.
- **Space Ghost and Dino Boy:** Twenty bundled programs, each containing three shorts: 18 season 1 bundles and two season 2 bundles. Preserve all three source segment numbers in the title; the first number sorts each intact bundle. The feature-length Alex Toth documentary is excluded. Language metadata is absent.
- **The Herculoids:** English collection contains 18 numbered programs, each bundling two stories. Preserve each intact pair; season zero denotes the collection sequence.
- **Galtar and the Golden Lance:** Collection contains 21 explicit season 1 stories; derivative MP4 duplicates collapse. Language metadata is absent.
- **Speed Buggy:** English collection contains 16 explicitly E-numbered episodes. Season zero denotes the source sequence.
- **Captain Caveman and the Teen Angels:** Reviewed collection contains 16 E-numbered original cartoon segments of approximately 11 minutes. Season zero denotes source sequence. Language metadata is absent; this is a partial collection.
- **Hong Kong Phooey:** Collection contains 16 season/episode-numbered bundles of cartoon stories. Keep each bundle intact; bonus featurettes are excluded. Language metadata is absent.
- **Dynomutt, Dog Wonder:** Collection has explicit S1 E01–E16 and S2 E01–E04 numbering. Four alternate Blue Falcon filename aliases and derivative MP4 duplicates collapse by explicit season/episode. Language metadata is absent.
- **Yogi Bear (original shorts):** Original short collection contains numbered items 1–68, generally seven minutes; the birthday story is longer. Season zero denotes collection order rather than broadcast seasons. Language metadata is absent.
- **Birdman and the Galaxy Trio:** English collection: 20 season 1 bundled programs, each preserving its Birdman and Galaxy Trio stories.
- **Jonny Quest (1964):** Original 1964 series collection: 26 E-numbered episodes. Season zero preserves explicit collection sequence. Language metadata is absent.
- **Super Friends (1973):** Original 1973 series: 16 S1 EP-numbered programs of approximately 45 minutes. Language metadata is absent.
- **The Flintstones:** Reviewed subset: 26 season 6 episodes only. Earlier seasons are not included in this release. Language metadata is absent.
- **The Jetsons:** Original series season 1: 24 explicitly numbered stories. Derivative MP4 duplicates collapse. Language metadata is absent.
- **Wacky Races (1968):** Original 1968 collection contains 17 explicitly numbered season 1 paired-story programs. Preserve complete source paths. Language metadata is absent.

Scooby-Doo candidates inspected here were unsuitable for automatic import: a purported season-one upload contained only a 30-second placeholder; another mixed duplicate files, split episodes and extras; an apparently complete season-one-and-two collection had no public MP4 files. Those candidates are excluded from this release. Other Hanna-Barbera shows can be added after source curation. Missing source language metadata is not a verified English-language claim.

## Validation

- All 44 tests and syntax checks pass. The new test checks additive migration, duplicate prevention, source order, bundle preservation, short-cartoon scheduling, 45-minute program scheduling and known partial seasons.
- First and last retained files from each of 16 additions returned HTTP 206, video/mp4 and an MP4 signature for 32-byte range requests. Endpoint evidence is recorded in the cartoon discovery artifact. Complete decoding and audio language were not verified.
- Existing episode arrays and user settings are preserved. The new library revision triggers additive installation into existing browser catalogs.
- Static release retains upstream attribution and includes no provider video files. Public availability does not establish distribution rights or future playback.
