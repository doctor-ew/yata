# Silver Spoons, The Wonder Years and Captain Kangaroo

Published additions for 0.8.5:

| Collection | Channel | Added items | Scope |
| --- | --- | ---: | --- |
| Silver Spoons (1982) | Comedy | 23 | One standalone episode and 22 labelled Antenna TV broadcast recordings; rerun recordings include commercials and surrounding airtime. |
| The Wonder Years (1988) | Drama | 115 | Original Fred Savage series with explicit season/episode numbering, not the 2021 reboot. |
| Captain Kangaroo | Nickelodeon | 14 | Original Bob Keeshan broadcasts and PBS/home-video presentations; unknown ordering remains season zero. |

All 152 source endpoints passed small byte-range checks. Nine representative codec probes reported H.264 video and AAC audio. Representative source frames were inspected and one sample from each show played in Chrome; surviving Captain Kangaroo copies vary in quality. Three explicitly partial Captain Kangaroo files were excluded. These checks do not establish complete decoding of every file or future availability.

Source records, endpoint checks and exclusions are in `data/three-tv-discovery.json`; representative codec evidence is in `data/three-tv-codec-probes.json`. `scripts/three-tv-discovery.mjs` reproduces the bounded import from reviewed Archive metadata. Original-series artwork and metadata references are in `data/library-art.json`. Videos remain on their providers; no media files were published to YATA storage.

The shared publication was reviewed against its previous immutable revision. It adds exactly three shows and 152 items, without removing existing shows, episodes or sources. The seed-library rebuild is separate from publication and was not used to replace the shared master.
