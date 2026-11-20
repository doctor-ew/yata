# Retro request wave and vintage game shows

Date: 2026-11-20

## Scope

This publication adds 39 shows and 1,291 source programs to the authoritative 274-show snapshot. Result: 313 shows, 13,925 entries and 14,239 sources. No previous show, episode or source is changed or removed. Existing Magnum, P.I. has five entries; the additional candidate duplicated an existing episode and was not added. Silver Spoons, Blue Thunder, Thundarr and The Dukes animated series were already present and remain unchanged.

| Series | Added entries |
| --- | ---: |
| Wings (1990) | 28 |
| Major Dad (1989) | 96 |
| Coach (1989) | 25 |
| Newhart (1982) | 92 |
| Married... with Children (1987) | 34 |
| Twin Peaks (1990) | 8 |
| Baywatch (1989) | 2 |
| Murder, She Wrote (1984) | 45 |
| Murphy Brown (1988) | 4 |
| Hawaii Five-O (1968) | 1 |
| Tales from the Crypt (1989) | 2 |
| Night Court (1984) | 1 |
| Matlock (1986) | 1 |
| In the Heat of the Night (1988) | 142 |
| Moonlighting (1985) | 6 |
| The Young Riders (1989) | 66 |
| Head of the Class (1986) | 32 |
| Doogie Howser, M.D. (1989) | 97 |
| L.A. Law (1986) | 171 |
| T. J. Hooker (1982) | 3 |
| Square Pegs (1982) | 19 |
| My Two Dads (1987) | 2 |
| Bosom Buddies (1980) | 37 |
| Jake and the Fatman (1987) | 102 |
| Dear John... (1988) | 3 |
| 21 Jump Street (1987) | 95 |
| Solid Gold (1980) | 3 |
| That's Incredible! (1980) | 13 |
| Mighty Mouse the New Adventures (1987) | 19 |
| Teen Wolf: The Animated Series (1986) | 1 |
| Star Search (1983) | 1 |
| Rhoda (1974) | 109 |
| Ripley's Believe It or Not (1982) | 1 |
| Hulk Hogan's Rock 'N' Wrestling (1985) | 18 |
| Match Game (1973) | 2 |
| Password Plus (1979) | 3 |
| The Hollywood Squares (1966) | 1 |
| Press Your Luck (1983) | 3 |
| The Price is Right (1972) | 3 |

Counts are checked source programs, not complete-series inventories. Combined pilots and paired animated segments stay intact. Unknown season/episode numbers remain zero, retaining source labels without invented ordering. Square Pegs retains 19 source programs, including an intact combined Christmas recording; alternative encodings, interviews and extras were excluded.

## Game shows and compatibility

Match Game uses two original 1973 BUZZR uploads. Password Plus has three vintage broadcasts, Hollywood Squares has its 1966 Bert Parks pilot, Press Your Luck has three episodes, and The Price Is Right has three 1984–85 Bob Barker broadcasts. Library metadata exposes their Game Show type/genre. They initially use the existing 70s Prime Time category. A dedicated game-show channel requires a coordinated client/capability rollout: publishing a new channel identifier immediately would make older validators reject the shared catalog. No dedicated game-show channel or new APK is shipped here.

## Sources and artwork

`data/retro-wave-selections.json` records exact original-series metadata IDs, reviewed Archive items and bounded YouTube selections. `data/retro-wave-discovery.json` records source checks and exclusions. `scripts/retro-wave-discovery.mjs` extends an authoritative base snapshot from those reviewed metadata files. Archive links passed byte-range GET and video content-type checks; YouTube selections returned public embeddable metadata and episode-length durations. These checks do not establish full decoding, language, distribution permissions or continued availability. Media remains with providers.

Original-era artwork was inspected for all additions, including original Night Court, Teen Wolf animation and Jack Palance's Ripley's. The Price Is Right uses a vintage Archive frame rather than Drew Carey marketing art. Representative video frames were inspected for Wings, Major Dad, Newhart, Twin Peaks, L.A. Law, Hulk Hogan's Rock 'N' Wrestling, That's Incredible, Rhoda and The Price Is Right. TVmaze metadata attribution and exact image sources are retained in the library-art feed. No AI imagery was used.

## Channel-builder regression prevention

The expanded eligible offer contains 303 shows and 21,829 UTF-8 bytes before envelope escaping. This exceeds the previous 20,000-character show-list field allowance. The backend field limit is now 28,000 characters; the full request byte cap remains 32,768 and non-channel requests remain limited to 16,384 bytes. Finite 512-show validation, approved IDs, per-field checks, moderation, session verification and usage budgets remain in force. A real-offer regression fixture covers the expanded catalog, and an IAM-authorized invalid-session canary reaches HTTP401 rather than a catalog-size HTTP400. It invokes no model. Larger catalogs can increase prompt size; no spending quota was increased.

## Delivery and verification

Catalog and artwork refresh remotely in compatible existing clients; interface version stays 0.8.21. No Apple or Android package build is required for these feed additions. This task does not ingest new episode summaries/transcripts into retrieval or claim new RAG coverage. Physical-device playback and live AI generation were not tested for this update.

299 client tests, 80 backend tests and 15 deployment tests in each Python mode passed. The static build and conditional publication review preserve prior inventory. The backend patch replaces only its compiled request-validator module; unrelated package entries remain byte-identical. The expanded real-offer denial canary passed before catalog publication.

Published revision: `98a74ddec5a15bc31127ba26f71c9e46627d1d07bd13364bf584b01c3ea81232`. The live manifest and snapshot returned the reviewed counts after publication; library artwork and release-note feeds match the published source. Dedicated Game Shows rollout: [issue #46](https://github.com/doctor-ew/yata/issues/46). Backend request-size fix: [PR #14](https://github.com/doctor-ew/midthown_hackathon_camp/pull/14).
