# Gadget heroes and adventure television

## Scope

Implements [issue 12](https://github.com/doctor-ew/floating-browser/issues/12). Add the five approved shows to YATA while preserving existing shows, sources and saved settings. Four shows supply 46 station-eligible media entries; Stingray supplies one external Tubi series link. An external listing is not an in-station video.

## Source coverage

| Show | Video entries | Notes |
| --- | ---: | --- |
| Blue Thunder (1984) | 11 | Individual television episodes, English metadata. |
| The Master (1984) | 13 | Individual television episodes, English metadata. |
| Tales of the Gold Monkey | 21 | Combined E1/E2 pilot plus individual E3–E22, English metadata. |
| Matt Houston | 1 | S2E5 only; language metadata absent. |
| Stingray (1985) | 0 | External Tubi series listing; playback not verified. |

## Source interpretation

### Blue Thunder (1984)

English 1984 television-series collection: 11 explicit season 1 episodes; the similarly named feature film is not included.

Reviewed items:

- [Blue Thunder - Complete Series 1984](https://archive.org/details/blue-thunder-complete-series-1984)

### The Master (1984)

English 1984 collection: 13 individual season 1 episodes. Master Ninja re-edited paired movies are not used.

Reviewed items:

- [The Master - Complete Series 1984](https://archive.org/details/the-master-complete-series-1984)

### Tales of the Gold Monkey

Twenty reviewed English-metadata Archive items supply 21 media files. E1 & 2 remains one combined pilot; individual files E3–E22 retain source numbering with season zero. The E6 collection also supplies E7. No invented pilot split points or broadcast season assignment.

Reviewed items:

- [Tales Of The Gold Monkey E 13 Ape Boy](https://archive.org/details/tales-of-the-gold-monkey-e-13-ape-boy)
- [Tales Of The Gold Monkey E 8 Once A Tiger](https://archive.org/details/tales-of-the-gold-monkey-e-8-once-a-tiger)
- [Tales Of The Gold Monkey E 18 Last Chance Louie](https://archive.org/details/tales-of-the-gold-monkey-e-18-last-chance-louie)
- [Tales Of The Gold Monkey E 1 & 2 Pilot](https://archive.org/details/tales-of-the-gold-monkey-e-1-2-pilot)
- [Tales Of The Gold Monkey E 4 Black Pearl](https://archive.org/details/tales-of-the-gold-monkey-e-4-black-pearl)
- [Tales Of The Gold Monkey E 5 Legends Are Forever](https://archive.org/details/tales-of-the-gold-monkey-e-5-legends-are-forever)
- [Tales Of The Gold Monkey E 15 High Stakes Lady](https://archive.org/details/tales-of-the-gold-monkey-e-15-high-stakes-lady)
- [Tales Of The Gold Monkey E 16 Force Of Habit](https://archive.org/details/tales-of-the-gold-monkey-e-16-force-of-habit)
- [Tales Of The Gold Monkey E 11 The Late Sarah White](https://archive.org/details/tales-of-the-gold-monkey-e-11-the-late-sarah-white)
- [Tales Of The Gold Monkey E 6 Escape From Death Island](https://archive.org/details/tales-of-the-gold-monkey-e-6-escape-from-death-island)
- [Tales Of The Gold Monkey E 14 God Save The Queen](https://archive.org/details/tales-of-the-gold-monkey-e-14-god-save-the-queen)
- [Tales Of The Gold Monkey E 9 Honor Thy Brother](https://archive.org/details/tales-of-the-gold-monkey-e-9-honor-thy-brother)
- [Tales Of The Gold Monkey E 12 The Sultan Of Swat](https://archive.org/details/tales-of-the-gold-monkey-e-12-the-sultan-of-swat)
- [Tales Of The Gold Monkey E 17 Cooked Goose](https://archive.org/details/tales-of-the-gold-monkey-e-17-cooked-goose)
- [Tales Of The Gold Monkey E 19 Naka Jima Kill](https://archive.org/details/tales-of-the-gold-monkey-e-19-naka-jima-kill)
- [Tales Of The Gold Monkey E 10 The Lady And The Tiger](https://archive.org/details/tales-of-the-gold-monkey-e-10-the-lady-and-the-tiger)
- [Tales Of The Gold Monkey E 21 A Distant Shout Of Thunder](https://archive.org/details/tales-of-the-gold-monkey-e-21-a-distant-shout-of-thunder)
- [Tales Of The Gold Monkey E 22 Mourning Becomes Matuka](https://archive.org/details/tales-of-the-gold-monkey-e-22-mourning-becomes-matuka)
- [Tales Of The Gold Monkey E 20 Boragora Or Bust](https://archive.org/details/tales-of-the-gold-monkey-e-20-boragora-or-bust)
- [Tales Of The Gold Monkey E 3 Shanghaied](https://archive.org/details/tales-of-the-gold-monkey-e-3-shanghaied)

### Stingray (1985)

Nick Mancuso live-action series. Tubi listing and cast checked; playback was not verified. This is one external series link, not an in-station playable episode. Correct Archive collection has MKVs but no supported MP4 derivatives; the unrelated 1964 puppet series was excluded.

[Tubi listing](https://tubitv.com/series/300013655/stingray). Listing and Nick Mancuso cast were checked; no video playback was performed. The entry has unknown duration and is excluded from automatic scheduling.

### Matt Houston

Partial coverage: one MP4 explicitly labeled season 2 episode 5, Needle in a Haystack. Language metadata is absent. French pilot and uncertain fragments were excluded.

Reviewed items:

- [Matt Houston 2x 5 Needle In A Haystack](https://archive.org/details/matt-houston-2x-5-needle-in-a-haystack)

## Acceptance and validation

- All 46 tests and syntax checks pass. Tests cover additive migration, genre scheduling, the combined Gold Monkey pilot, source episode numbers, partial Matt Houston coverage, external Stingray exclusion and repeated-import deduplication.
- First and last selected files from each video collection returned HTTP 206, video/mp4 and an MP4 signature for 32-byte range requests. Matt Houston has one selected file, so both endpoint samples reference it. Full decoding and audio language were not independently verified.
- Existing catalog episode arrays remain intact. The new library revision imports additions without replacing user settings or sources.
- Static deployment mirrors no provider videos and retains upstream attribution. Availability does not establish distribution rights or guarantee future playback.
