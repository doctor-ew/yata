# YATA changelog

User-visible changes to YATA web, Android and Arcade. Versioned dates use GitHub release publication dates in UTC. Early web milestones are backfilled from repository history. Android downloads are debug-signed sideload prereleases; iOS/TestFlight is not released. Media availability can change.

## 0.8.20 — 2026-11-19

- Explicit make/create/build-channel requests now call the guarded planner inside buddy chat. A reply to the buddy’s channel prompt continues that flow.
- Fixed the backend show-count ceiling rejecting the current catalog, preserving existing request-byte, verification and usage limits.

## 0.8.19 — 2026-11-19

- The saved Static switch now disables both channel-change and loading snow. Zero strength and accessibility preferences suppress both; sound remains separately configurable.

## 0.8.18 — 2026-11-19

- Loading and channel changes now share the same original animated TV snow; removed the remaining SVG loading texture.

## 0.8.17 — 2026-11-19

- Replaced the repeating SVG tuning texture with original animated monochrome snow frames and a direct cut back to the picture. Removed the fade-out.

## 0.8.16 — 2026-11-19

- Channel transitions now use higher-contrast monochrome TV snow, with timing and sound starting on a render frame after synchronous UI work. The hiss is longer and more distinct; mute, volume and accessibility settings remain respected.
- Enter now sends a buddy message; Shift+Enter inserts a line break. Talk remains available, and IME composition does not accidentally submit.
- Removed the show-specific motorcycle shortcut. Descriptions use the verified AI planner with the current catalog; episode alternatives are explicitly labelled and require selection.

## 0.8.15 — 2026-11-19

- Removed the show-specific motorcycle comparison shortcut. Descriptive watch requests now use the verified AI planner and current playable catalog; literal show-title requests keep the instant path.
- When a named-series episode search finds only other-series candidates, the buddy labels them as possible alternatives and waits for a selection. It does not claim they are the requested episode or silently change playback.

## 0.8.14 — 2026-11-19

- Fixed tuning snow and optional sound being skipped by Guide, Library or buddy playback after the previous player was cleared.
- Specific episode requests now precede show-channel commands. Named Knight Rider episode plots cannot silently become Street Hawk; unsupported matches leave playback unchanged.
- Added 72 checked original live-action Swamp Thing (1990) entries to Sci-Fi and 55 Beauty and the Beast (1987) entries to Drama, with original artwork.

## 0.8.13 — 2026-11-18

- Channel changes now show a brief burst of animated grey TV snow, then clear to the next picture without delaying playback. Optional channel tuning hiss and click follow the existing sound setting, player volume and mute.
- The effect respects static-off, zero strength, reduced-motion and forced-color preferences. Tuning duration remains configurable; the new default is 240 ms.

## Catalog update — 2026-11-18

- Added Harlem Globetrotters (1970), The New Scooby-Doo Movies (1972), The Super Globetrotters (1979), Bananaman (1983) and original George of the Jungle (1967), with original-series artwork.
- Added 100 checked entries: 17 Harlem episodes, 24 Scooby guest-star episodes, two English Super Globetrotters episodes, 40 uploader-labelled Bananaman shorts and 17 intact George/Super Chicken/Tom Slick programs.
- Available through the shared catalog on web and Android 0.8.10 or later; no APK update.

## Buddy roster update — 2026-11-18

- Added Mrs. Roper and original Jonny Quest’s Bandit as selectable remote companions, with credited vintage portraits and three hover lines each. No APK update required.

- Added original WKRP in Cincinnati companion Les Nessman, with credited portrait, selectable aliases and three rotating hover lines. Available through the remote roster without another APK.
- Added Junior Wetworth from Snorks, Brainy Smurf and original Police Squad-era Frank Drebin, with credited original-era images and distinct greetings and hover lines.
- Available through the remote roster on web and Android 0.8.12 without another APK. Ask the companion to turn into Wetworth, Brainy or Detective Drebin.

## 0.8.12 — 2026-11-18

- Companion rosters, portraits, aliases, greetings and hover lines now refresh from a validated public feed, with cached and bundled offline fallback.
- Pinned buddies survive roster refreshes. TV and Arcade selections, channel hosts and the native chat bridge use the same refreshed roster.
- Future approved characters can be published without an APK update. New capabilities still require application changes; character voices and permissions remain controlled by the backend.

## Catalog update — 2026-11-18

- Added Pinwheel to Nickelodeon with four surviving broadcast recordings labelled as full episodes by the uploader. Original episode numbers are unknown; short clips and partial tapes were excluded. Available through catalog refresh on apps from 0.8.10, with no APK update required.

## 0.8.11 — 2026-11-18

- Added Snorks (1984): 76 checked standalone shorts on Saturday Morning.
- Added Captain Planet and the Planeteers (1990): 113 checked episodes on Saturday Morning, including its New Adventures continuation.
- Added Road to Avonlea (1990) to Drama with three checked season-five episodes and original-series artwork. The original Smurfs remains available with 432 checked entries.

## 0.8.10 — 2026-11-18

- Added original Punky Brewster to Comedy with 86 checked entries, including labelled intact paired presentations.
- Added 54 checked Clarissa Explains It All episodes and five verified public, embeddable Ramona (1988) episodes to Nickelodeon, with original-series artwork.
- Expanded catalog capacity using a separate feed. Older app builds keep their compatible 255-show edition; update to see the new additions.

## 0.8.9 — 2026-11-17

- Ask a companion to find an episode by plot: chat now searches the available sourced episode summaries and answers in character with TVmaze citations.
- Matched episodes have a play button that rechecks the current catalog. Search currently covers 86 summaries from Gargoyles and Street Hawk; scripts, exact dialogue and scene timestamps are not searched.

## 0.8.8 — 2026-11-17

- Added Punky Brewster, Clarissa, Vicki, Maude, Dorothy, Rose, Blanche, Sophia and original-era Firefly as selectable, pinnable companions with credited portraits.

- All 48 companions now rotate character-specific hover and keyboard-focus lines without immediate repeats.
- Hover notes can mention current and next titles; they are instant, silent and make no paid AI requests. Mobile tap still opens chat.

## 0.8.7 — 2026-11-17

- Search episode and story titles across the whole library, with existing channel, genre, decade and availability filters. Results preserve collection labels and checked playback sources; descriptions and transcripts are not searched yet.

- Added sourced US series ratings to library cards and show details for Gargoyles, Gummi Bears, Rescue Rangers, Darkwing Duck, X-Men, Aqua Teen Hunger Force and The Venture Bros.
- Unverified ratings remain Unrated. Series labels link to Disney or Adult Swim; archived edits, collections and breaks may differ. These labels do not enforce parental controls.

## 0.8.6 — 2026-11-17

- Library artwork and Arcade cards now refresh from validated public JSON feeds, with cached or bundled fallback. Private Plex integration is still roadmap work.
- Made Watch, Guide and Library navigation more visible and available through buddy chat. Optional companion text notes use current/next titles, suggestions and character quips; motorcycle Knight Rider requests can resolve to checked Street Hawk.
- Added eight requested original series with 519 checked entries: Gargoyles, Gummi Bears, TMNT (five first-season episodes), Animaniacs, Tiny Toons, Darkwing Duck, Rescue Rangers and Mighty Morphin Power Rangers. Tiny Toons and Rescue Rangers currently use labelled collections/specials.
- Choose an episode beside the playing program; filter by title/story and season. Grimm’s currently has one verified VHS compilation.
- Added fullscreen on the picture and automatic landscape expansion on touch phones while keeping playback position. Browser/native fullscreen depends on platform support; physical iPhone verification remains outstanding.

[Android release](https://github.com/doctor-ew/yata/releases/tag/yata-android-v0.8.6)

## 0.8.5 — 2026-11-17

- Added Silver Spoons (1982) to Comedy: one standalone episode and 22 labelled Antenna TV broadcast recordings, which include commercials and surrounding airtime.
- Added 115 original-series Wonder Years episodes to Drama, and 14 original Captain Kangaroo broadcasts or presentations to Nickelodeon.
- All 152 new source endpoints passed byte-range checks; representative sources use H.264/AAC. Explicit partial Captain Kangaroo files were excluded.

[Android release](https://github.com/doctor-ew/yata/releases/tag/yata-android-v0.8.5)

## 0.8.4 — 2026-11-17

- Added game-aware play requests: choose TV or game for ambiguous names, retain a locked game until Konami unlock, and launch the exact installed game afterward. Cancelling or closing chat clears the pending launch.
- Arcade now has its own pinnable companions: Pac-Man, Donkey Kong, Q*bert, Frogger, Mario and Sonic, with game controls and documented mod context.
- Added Droids-era C-3PO, Kojak and Captain Kangaroo as TV companions. The full roster has 39 characters. Silver Spoons, The Wonder Years and Captain Kangaroo are not in the playable TV lineup.

[Android release](https://github.com/doctor-ew/yata/releases/tag/yata-android-v0.8.4)

## 0.8.3 — 2026-11-17

- Added Strawberry Shortcake, Jem, original She-Ra, Kermit, Miss Piggy and Gonzo as selectable, pinnable buddies; the roster now has 31 characters.
- Added a backfilled GitHub changelog linked from the website and Android About menu.
- Ask your buddy “what’s new?” for the latest updates in its character voice, with a changelog link and factual fallback when AI is unavailable.

[Android release](https://github.com/doctor-ew/yata/releases/tag/yata-android-v0.8.3)

## 0.8.2 — 2026-11-17

- Switch and pin companions through chat: “Turn into Twiki”, “pin you”, or “unpin”.
- Queue a checked episode with “Play Mork and Mindy next” without interrupting the current episode; append with “Add Taxi to my queue”.
- Character preferences and the Channel 00 episode queue persist on the same browser or app.

[Android release](https://github.com/doctor-ew/yata/releases/tag/yata-android-v0.8.2)

## 0.8.1 — 2026-11-17

- Explicit watch requests create, save and tune Channel 00; broader requests build inside buddy chat.
- Added Scooter, Super Friends Robin, Master Shake, Orko, Penny, Inspector Gadget and classic Velma.
- Removed leading Ah fillers; embedded native buddy verification keeps replies in chat.

[Android release](https://github.com/doctor-ew/yata/releases/tag/yata-android-v0.8.1)

## 0.8.0 — 2026-11-17

- Added a saved Channel 00 episode queue with guide actions, reorder, remove, play and resume.
- Corrected repeated metadata and page-cache paths that could reset paused playback; added reload resume.
- Physical-iPhone follow-up remains open; cross-device queue sync is not included.

[Android release](https://github.com/doctor-ew/yata/releases/tag/yata-android-v0.8.0)

## 0.7.1 — 2026-11-17

- Enabled anonymous usage analytics with a private owner dashboard and viewer opt-out.
- Collection excludes chat text, email, private URLs and persistent viewer identifiers; GPC/DNT disable it.

[Android release](https://github.com/doctor-ew/yata/releases/tag/yata-android-v0.7.1)

## 0.7.0 — 2026-11-17

- Added 18 selectable TV companions and chat-first GitHub feedback drafts with a fallback form.
- Shared 11 rotating or pinned vintage room finishes across web and Android.
- Added buddy Konami unlock and expanded the checked cartoon and vintage programming catalog.

[Android release](https://github.com/doctor-ew/yata/releases/tag/yata-android-v0.7.0)

## 0.6.2 — 2026-11-17

- Opened Arcade on classic Atari, arcade and NES titles, with Flash games on an optional lazily loaded shelf.

[Android release](https://github.com/doctor-ew/yata/releases/tag/yata-android-v0.6.2)

## 0.6.1 — 2026-11-17

- Fixed Samsung WebView long-press interception for the hidden Arcade code controls.

[Android release](https://github.com/doctor-ew/yata/releases/tag/yata-android-v0.6.1)

## 0.6.0 — 2026-11-17

- Published the standalone YATA Android sideload preview.
- Added automatic background audio for supported Archive episodes, native sharing, episode summaries and available source captions.
- Simplified Watch, Guide and Library navigation; added vintage rooms, faction decals, warmer typography and tuning snow with CRT effects enabled by default.

[Android release](https://github.com/doctor-ew/yata/releases/tag/yata-android-v0.6.0)

## Early web and app development — 2026-11-16

- Added per-channel and full-lineup remix, improved arcade controls and refreshed original-era library artwork.
- Built the Android-first app with episode information, available provider captions, sharing and automatic supported Archive background audio.
- Added rotating rooms, original faction decals, warmer typography and tuning static.
- Established YATA as its own repository, preserving attribution and third-party notices.
- Expanded Arcade with fourteen installed classic and fighting-game additions and six-button controls.

[Changes](https://github.com/doctor-ew/yata/commit/f6dc8ea) · [Android foundation](https://github.com/doctor-ew/yata/commit/211e53b) · [Standalone repository](https://github.com/doctor-ew/yata/commit/4e05551) · [Arcade expansion](https://github.com/doctor-ew/yata/commit/fb6f512)

## Channel and Arcade expansion — 2026-11-15

- Expanded Saturday Morning, Late Night Toons, sitcoms and vintage interstitials.
- Added Star Trek to Sci-Fi and its original animation to Saturday Morning, plus Droids, the Holiday Special, Sealab 2020 and Venture Bros collections.
- Added Nickelodeon and Drama streams, personal channel-mix switches and configurable seek display; ordered the lineup from daytime through prime time to late night.
- Built and published the retro Arcade with cabinet controls and a secret Konami entrance; fixed Firefox quick-find interference.

[Channel expansion](https://github.com/doctor-ew/yata/commit/62ccae7) · [Arcade publication](https://github.com/doctor-ew/yata/commit/4833601) · [Firefox correction](https://github.com/doctor-ew/yata/commit/324bf52)

## Guide and personal channels — 2026-11-14

- Added Comedy and 70s Prime Time, a TV Guide with actual station schedules, live joining and episode starts.
- Added the retro remote, compact settings and a sticky expandable television.
- Added character-hosted personal channels and original-character portraits.
- Applied “It’s probably a rerun” to page copy, title and sharing metadata; restored visible creator and attribution links.

[TV Guide](https://github.com/doctor-ew/yata/commit/2fb7152) · [Personal channels](https://github.com/doctor-ew/yata/commit/8511e3b) · [Metadata](https://github.com/doctor-ew/yata/commit/e236823)

## Initial YATA web station — 2026-11-13

- Built and published the nostalgia station, expanded its checked episode library and renamed it YATA.
- Added unified transport, episode navigation, balanced random streams and window-filling playback.
- Added vintage commercial breaks, selectable television cabinets, CRT effects, working dials and episode sharing.
- Added Sci-Fi and separate Midnight Matinee programming.
- Added owner-managed shared catalog publication and protected local drafts across tabs and updates.

[Initial station](https://github.com/doctor-ew/yata/commit/14e6a7b) · [YATA naming](https://github.com/doctor-ew/yata/commit/e62d52b) · [Sci-Fi and Matinee](https://github.com/doctor-ew/yata/commit/69f0dbd) · [Shared catalog](https://github.com/doctor-ew/yata/commit/f5b344a)

## Planned work

Future proposals and unresolved follow-ups belong in the [roadmap](docs/ROADMAP.md) and [GitHub issues](https://github.com/doctor-ew/yata/issues). They are not shipped features.
