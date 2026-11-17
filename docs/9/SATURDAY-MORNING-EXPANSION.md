# Saturday Morning catalog expansion

## Scope

Implements [issue 9](https://github.com/doctor-ew/floating-browser/issues/9). Add eight requested cartoon shows to Saturday Morning and the mixed stream. Preserve all existing episodes, including 27 Dungeons & Dragons episodes.

## Reviewed coverage

| Show | Episode entries | Collection |
| --- | ---: | --- |
| Bionic Six | 65 | [Source](https://archive.org/details/bionic-six-complete) |
| Jayce and the Wheeled Warriors | 65 | [Source](https://archive.org/details/jayce-and-the-wheeled-warriors-e-59) |
| Pole Position | 13 | [Source](https://archive.org/details/pole-position-complete-series-1984) |
| Turbo Teen | 12 | [Source](https://archive.org/details/TurboTeenCollection) |
| BraveStarr | 19 | [Source](https://archive.org/details/bravestarr-english) |
| Defenders of the Earth | 65 | [Source](https://archive.org/details/defenders-of-the-earth-s-01-) |
| Drak Pack | 16 | [Source](https://archive.org/details/hanna-barbera-drak-pack-1980-animated-series) |
| Dragon’s Lair | 13 | [Source](https://archive.org/details/dragons-lair-complete-series-1984) |

## Source interpretation

- **Bionic Six:** English collection: explicit season 1 episodes 1–22 and season 2 episodes 1–43.
- **Jayce and the Wheeled Warriors:** Collection contains filename-numbered E01–E65. Season zero preserves source sequence without asserting broadcast seasons; source language metadata is absent.
- **Pole Position:** English collection uses filenames 101–113; interpreted as season 1 episodes 1–13.
- **Turbo Teen:** Twelve complete episodes: 1–11 and 13. Episode 12 exists only as short clips and is excluded. Uploader identifies episodes 1–5 and 11 as non-English audio with English subtitles; those titles are labeled. Season zero denotes source episode numbering.
- **BraveStarr:** English subset with unnumbered titles. Season zero and stable collection sequence do not establish broadcast order. Duplicate MP4 encodes collapse by title. Other language collections and unmapped whole-disc DVD files are excluded.
- **Defenders of the Earth:** Source collection contains explicit season 1 episodes 1–65; language metadata is absent.
- **Drak Pack:** English collection contains source-numbered episodes 1–16. Season zero retains source numbering; alternate collection with conflicting numbering is not merged.
- **Dragon’s Lair:** English original cartoon collection: season 1 episodes 1–13; excludes video game material.

## Acceptance and validation

- Additive library installation imports new shows on revision change and preserves saved settings and sources.
- Runtime filtering excludes fragments, intros and other files outside 1,000–1,900 seconds. Source-specific numbering handles season/episode filenames, E-prefixed numbers, and Pole Position three-digit numbers.
- First and last retained files from each new show, plus Dungeons & Dragons, returned HTTP 206, video/mp4 and an MP4 signature for a 32-byte range. Checks are recorded in the cartoon discovery artifact. Complete browser decoding was not tested.
- All 43 tests and syntax checks pass. Migration, duplicate prevention, source numbering, Turbo Teen gaps/subtitle labels and Dungeons & Dragons preservation are covered.
- No provider video files are mirrored in the static deployment. Availability and source metadata do not establish distribution rights or future playback.
