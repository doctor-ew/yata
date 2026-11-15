# YATA — Yet Another TV App

A personal nostalgia TV station with a retro channel guide, a curated show library, and media that plays from its original provider.

## Hosted station

Open **https://doctorew.com/tv/**. This static deployment uses the existing S3 bucket and CloudFront distribution. Catalog installation and provider playback run in your browser; no media is rehosted. Browser storage is separate from localhost and other devices. The public site is a viewer; catalog editing and import/export management are available in the loopback owner app.

The hosted viewer verifies and installs published catalog updates and retains watching, dials, stream settings and sharing. Seeding, source editing, removal, discovery and catalog import/export are loopback owner tools. The static-view marker controls presentation, not authentication; visitors who tamper with their browser copy cannot change the shared deployed catalog. Deployment details and update commands are in [the AWS deployment guide](../docs/4/DEPLOYMENT.md).

## Run locally

Requirements: a current Node.js installation and a modern browser. No package installation, account, or API key is required.

From this repository's root:

```sh
cd nostalgia-tv
npm start
```

Open the printed address: <http://127.0.0.1:4173>. Keep the terminal running. Press Ctrl+C in that terminal to stop the station. If the port is occupied, run `PORT=4174 npm start` and use the new printed address. This command does not operate the native Floating Browser app.

The owner server runs while its terminal remains open. The launcher does not create a background service.

## Random continuous streams

The four channel buttons are random streams by default: **Sci-Fi** mixes science-fiction television, **Saturday Morning** mixes the checked cartoon shows, **Action Adventure** mixes action shows, and **YATA** mixes everything. Choose a channel and **Tune in live**, or use **New mix & play** for a fresh shuffle starting now.

For random episodes of one show, choose it in the **Stream** selector or open its library card and select **Shuffle this show**. Clear that selector back to **Any show** to mix the genre again. **Stories per show turn** chooses 1–3 before switching shows. Multipart stories stay together; smaller libraries keep receiving a turn instead of disappearing after their episode pool is exhausted.

Rotation, selected show, shuffle seed and story count are saved with the catalog. The same catalog/settings produce the same schedule, so refreshing preserves the station clock and lineup. Press Play to rejoin after a refresh. **New mix & play** deliberately changes the seed and resets the clock. Choose **Episodes in order** to retain sequential rotation.

Each show draws from shuffled story pools during the generated station cycle. The finite station schedule eventually loops, so repeats can occur at that overall loop boundary. This is browser-local scheduling, not a server-synchronized broadcast; differing catalogs/settings can have different lineups. Only checked sources with known runtimes enter continuous streams.

## Watch

**Fill window** expands the video and transport controls to the browser viewport. Use **Exit window** or Escape while the page has focus to return. It keeps the current player in place, so the presentation change does not recreate the video or YouTube iframe. Native/provider fullscreen remains available in the original player controls.

- Select YATA, Action Adventure, or Saturday Morning.
- **Tune in live** joins a checked episode at the position calculated from your station clock. **Start from beginning** starts the selected episode at zero.
- The playback bar provides play/pause, scrubbing, ±10 seconds, restart, previous/next, volume/mute, and elapsed/total time in `HH:MM:SS`. Controls activate when the source is ready; unknown duration stays explicit. Restart seeks within the current player. Manual browsing follows the selected show; station playback follows the channel queue. YouTube playlists keep their own previous/next navigation.
- **Next episode** advances to another playable item in that queue, if available. Playback failure offers a deliberate Retry, Skip, or Original source action; it never retries indefinitely.
- The Library includes all requested shows, including those with no added episode sources. A show card opens its episode/source list.
- The curated expanded library is added automatically on load, including to an existing saved catalog. Public Archive episodes with metadata runtimes enter the station rotation; official YouTube candidates need a playback check. Coverage and gaps are recorded in [the generated coverage report](../docs/3/COVERAGE.md). The supplied Saturday Morning Simulator link is retained as a compilation with unchecked YouTube playback. The G.I. Joe miniseries episode opens on Tubi.
- An empty channel does not imply that its shows are unavailable everywhere. It means your local catalog does not yet contain a checked, schedulable episode for that channel.

## Add and edit sources

Choose **Manage sources**, select a show, and enter an Archive item, YouTube video/playlist, or Tubi episode URL. Enter a title when the source does not supply one. Missing runtime remains unknown; do not invent a value to make an episode enter the guide.

| Source | Behavior |
| --- | --- |
| Internet Archive item | Reads public item metadata in your browser and imports compatible MP4 files. Alternate encodes linked to the same original are deduplicated. Existing source URLs in the same show are not imported again. |
| Internet Archive MP4 | Adds a direct source. Playing it checks its runtime from media metadata. |
| YouTube video | Uses the official player. A successful playing event checks the source and runtime. An unavailable or embed-blocked video displays an error with its original link. |
| YouTube playlist | Uses the official playlist player, which manages advancement between its own videos. Playlists are not scheduled as one episode. |
| Tubi | Opens the original Tubi page in another tab. It is not embedded or included in continuous station playback. |

Inside a show's episode list, **Edit details / add another source** changes its title, runtime, season/episode order, multipart group, or adds an alternative source. Leave the URL empty to edit metadata only. An optional IMDb title reference can be supplied for the show; no IMDb lookup or availability claim is inferred from it.

Adjacent episodes with the same multipart group stay together. Mark a supplied item as a bumper/commercial and enable **Include my bumpers** to interleave it. No commercial clips are included by default.

## Expanded library

Refresh the page to install the expanded curated library automatically. It preserves your sources and channel settings and installs once per content revision. The same revision does not continually restore items you remove. **Fill all shows** opens a review of the discovered library, with show selection, search notes, per-show filtering and 50-row pages. Review counts are source candidates; matching episode titles and explicit season/episode pairs combine alternative sources.

The catalog includes the public-source episodes found during the recorded searches. It does not assert complete worldwide availability. Known gaps, source numbering differences and search limits are recorded in the discovery files and [coverage report](../docs/3/COVERAGE.md). Unknown ordering remains season zero.

A portable baseline catalog is available at [expanded-catalog.json](data/expanded-catalog.json). Importing it replaces the current catalog through the normal import tool; automatic installation and whole-library review instead merge additively. Export your personal catalog for a backup of your own edits.

To rebuild the metadata packs, run the three scripts below from this directory, then build the library manifest. These commands contact public providers, read metadata only and may take several minutes. The YouTube refresh requires the installed `yt-dlp`. The reviewed Archive source lists are intentional; these refreshes do not promise an exhaustive search for newly uploaded collections.

```sh
node scripts/action-discovery.mjs
node scripts/cartoon-discovery.mjs
node scripts/youtube-discovery.mjs
node scripts/build-library.mjs
```

## Seed playlists in bulk

Choose **Seed playlists +** near the bottom of the page. Select a show, paste Archive item or YouTube playlist/video links (one per line), and choose **Discover episodes**. Review and edit the show, title, season, episode number and multipart group for each entry. Uncheck anything unwanted, then choose **Add selected episodes**. Duplicate source URLs are skipped across the catalog; your existing sources and settings are retained.

**Use Transformers collection** fills in the official Hasbro Pulse collection URL and selects The Transformers as the destination. Choose **Discover episodes** to review the videos; the provider can change this collection over time.

**Load cartoon starter pack** stages five official-channel candidates for He-Man, G.I. Joe and Transformers, including all three More Than Meets the Eye parts. It works with an existing saved catalog and does not require clearing browser data. Play each YouTube candidate from its library card to check embedded playback and enter the live rotation. Metadata discovery alone does not establish playback availability.

YouTube discovery requires `yt-dlp` available on the Node server's PATH. It reads metadata with downloads disabled; no API key is required. The server limits discovery to 200 videos per source and one request at a time. Use smaller playlists when a request exceeds the limit or times out. Archive discovery uses public item metadata and needs no additional tool. Archive collection pages are not recursively expanded; paste their individual item links.

If a playlist fails, its error is shown beside the successful discovery count. Review successful entries before approving a partial batch. Closing the dialog saves nothing. Export a catalog copy after seeding to keep a backup.

## Catalog storage

The public master is stored as versioned S3 JSON snapshots. Owner drafts use IndexedDB; public viewing preferences use separate browser storage. The legacy `drew-tv.catalog.v1` value remains untouched for recovery. See **Shared catalog and owner publishing** below. Clearing browser data can discard unpublished owner drafts and preferences. **Export catalog** downloads a JSON copy; **Import catalog** validates the complete file before replacing the current catalog. Imports are limited to 2 MB, 100 shows, 5,000 episode items, and 20 sources per episode. Export before removing items or replacing a catalog if you want a restore point.

A version-1 catalog contains:

- `epoch`: a station start time in Unix seconds.
- `settings`: selected `channel` (`mixed`, `action`, or `cartoons`), boolean `bumpers`, `rotation` (`random` or `ordered`), integer `shuffleSeed`, `storiesPerTurn` (1–3), and `streamShow` (a show ID or null). Older catalogs receive random-mode defaults when these fields are absent.
- `shows`: unique `id`, `title`, `channel` (`action` or `cartoons`), optional `imdbUrl`, and `episodes`.
- Episodes: unique `id`, `title`, `season`, `number`, `durationSeconds` (positive number or null), `group`, `kind` (`episode` or `bumper`), and `sources`.
- Sources: `id`, `provider` (`archive`, `youtube`, or `tubi`), HTTPS `url`, and `availability` (`verified` or `unverified`). A checked source can still become unavailable later.

Unpublished owner edits stay in the owner browser. Confirm publication to distribute a reviewed catalog to public viewers. Concurrent owner edits are revision-checked transactionally; conflicting drafts remain recoverable. Media remains at its original host; this app does not proxy, download for offline use, extract streams, or rehost it.

## Playback limitations

Press Play to start media. Browser autoplay policy, provider outages, regional restrictions, and embed permissions can prevent playback. YouTube's own ads and controls are preserved. Live seeking is best effort; the guide is not a frame-accurate synchronization guarantee. Original-source links remain available when embedded playback fails.

Catalog metadata, an accessible URL, an API stand-in, and observed browser playback are different evidence. The validation report records them separately. Titles without added sources do not represent verified streaming availability.

## Validate

```sh
npm test
npm run check
```

To repeat the optional real Archive metadata and media range check, run `npm run verify:archive`. It requires network access and does not establish browser decoding.

Tests use Node's built-in test runner and local provider stand-ins. No provider credentials or live playback are required to run them. Bulk seeding scope and results are in [its specification](../docs/2/SPEC.md) and [validation report](../docs/2/VALIDATION.md). See [the specification](../docs/1/SPEC.md) and [validation report](../docs/1/VALIDATION.md) in the repository for task scope and observed results.

## Attribution

YATA — Yet Another TV App is created by **Drew Schillinger**: [GitHub](https://github.com/doctor-ew) · [CTO2GO](https://cto2go.co) · [doctorew.com](https://doctorew.com).

This companion is part of [doctor-ew/floating-browser](https://github.com/doctor-ew/floating-browser), based on Floating Browser by Chris Hansen. The original copyright notice and MIT license remain in the repository root.

Channel scheduling was inspired by [Old Time Radio by Rob Dawson](https://github.com/codebox/old-time-radio). This companion was independently implemented; no radio implementation code was copied. Show names identify their respective series. Media is served by Internet Archive, YouTube, or Tubi, and this project is not affiliated with those services or the listed shows.

To refresh selected reviewed cartoon collections while retaining other records, set `CARTOON_SHOWS` to comma-separated show IDs. For example, `CARTOON_SHOWS=spider-friends,hulk-1982 node scripts/cartoon-discovery.mjs`, then `npm run build:library`. The discovery artifact records which shows were refreshed. A selected collection yielding no episodes leaves the previous artifact unchanged.

## Additional Saturday Morning shows

The reviewed catalog adds Bionic Six, Jayce and the Wheeled Warriors, Pole Position, Turbo Teen, BraveStarr, Defenders of the Earth, Drak Pack, and Dragon’s Lair. Dungeons & Dragons retains 27 episodes. Turbo Teen has 12 complete entries with episode 12 missing; episodes 1–5 and 11 are labeled for non-English audio with English subtitles. BraveStarr currently has 19 reviewed English entries. See [source coverage and validation](../docs/9/SATURDAY-MORNING-EXPANSION.md).

## Hanna-Barbera and adventure cartoons

The next reviewed expansion adds 402 items across 16 shows, including original Yogi Bear shorts, Space Ghost and Dino Boy bundles, The Herculoids, Jonny Quest, Birdman, Super Friends, The Jetsons, Wacky Races, Speed Buggy, Hong Kong Phooey, Dynomutt, Captain Caveman, a season-six Flintstones subset, Galaxy Rangers, Visionaries, and Galtar. Short segments and longer programs retain their source runtimes. This is a partial Hanna-Barbera collection; see [coverage, source language limits and validation](../docs/10/HANNA-BARBERA.md).

## Cartoon Express deep cuts

The latest batch adds Butch Cassidy and the Sundance Kids, Clue Club, Goober and the Ghost Chasers, Wheelie and the Chopper Bunch, The Funky Phantom, and Inch High, Private Eye. Live-action additions are Wizards and Warriors, The Powers of Matthew Star, Whiz Kids, Misfits of Science, and Otherworld. Goober lacks episode 7; Wheelie files each contain three stories. See [source coverage and editorial direction](../docs/11/DEEP-CUTS.md).

## Gadget heroes

Added Blue Thunder (11 videos), The Master (13), Tales of the Gold Monkey (21 including its combined pilot), and a one-episode Matt Houston subset. Stingray (1985) has an external Tubi series link and is excluded from automatic station playback. See [reviewed sources and limits](../docs/12/GADGET-HEROES.md).

## Vintage commercial breaks

Enable **Vintage commercial breaks + my bumpers** in Stream settings for one short break between complete stories. The starter pack contains 14 standalone, approximately 30-second vintage toy, cereal and game commercials. Breaks work across channels and show-only streams; Next skips a clip. Commercial breaks default to on; the cabinet update also enables them once for older saved catalogs. Choices made after that upgrade are remembered. Browse Vintage commercial breaks in the library to preview or remove sources. See [source credits, scheduling and validation](../docs/13/COMMERCIAL-BREAKS.md). Inspired by [retro-tv-webos](https://github.com/Nikolay1243/retro-tv-webos) and Joey Cato’s [MyRetroTVs](https://www.myretrotvs.com/); independently implemented.

## Optional CRT picture

Stream settings now offers **CRT surround & scanlines** and **Tuning static**. These independently drawn effects preserve provider-player placement, save your preference, and can be switched off. Tuning static is a brief silent fade and respects reduced-motion settings. Commercials start on, with a one-time upgrade for older Off defaults; later choices are preserved. See [defaults and effect validation](../docs/14/CRT-AND-DEFAULTS.md).

## TV cabinets, static and episode sharing

Choose a 1970s woodgrain, 1980s color-TV, 1990s charcoal cabinet, or None in Stream settings. The video player stays in place and Fill window still works. Adjust static strength, tuning length, tuning/continuous mode, and preview it. The effect settings are remembered independently. Commercials per break can be 1, 2, 3, or Random 1–3, capped to the available distinct clips.

Use **Share episode** beside the player; check **Include position** for a timestamp. Each library item also has a Share action. Recipients see the matching episode with a Play button. Links match provider source URLs rather than browser-local IDs; custom sources absent from the recipient’s catalog offer an original-source link. See [cabinet and migration details](../docs/15/TV-CABINETS.md) and [episode sharing](../docs/16/SHARING.md).

The cabinet’s top dial advances to the next playable show in the selected channel. The bottom dial starts a new random mix; Stream settings selects this channel, one random show, or everything. **Dial click & static burst** defaults on, remembers your choice, and follows player mute and volume. The sound is synthesized locally without audio downloads. Static strength and duration apply to dial bursts; reduced-motion preferences suppress the visual effect. Automatic episode transitions do not play the click.

Fill window expands the player to the entire browser viewport, with playback controls and tuning dials overlaid on the video. The cabinet frame returns when you exit. Video keeps its original proportions, so letterboxing can remain.

## Sci-Fi channel

Channel 03 is **Sci-Fi**, between Action Adventure and Saturday Morning (now channel 04). It contains nine live-action series already present in the curated library: Automan, The Phoenix, Voyagers!, Buck Rogers in the 25th Century, Battlestar Galactica, V, The Powers of Matthew Star, Misfits of Science, and Otherworld. Existing source metadata makes 156 entries eligible for the station, including 33 Buck Rogers and 21 Battlestar entries. Eligibility does not guarantee future source availability or successful decoding of every file.

Saved catalogs automatically move these curated shows out of Action Adventure. A selected show-only stream follows its show to Sci-Fi. Episode sources, ordering, custom shows, and commercial preferences remain intact. All-shows YATA still includes every channel; animated science fiction stays on Saturday Morning. Dials, random streams, and optional commercial breaks use the same scheduling rules as other channels. See [migration and validation](../docs/18/SCI-FI-CHANNEL.md).

## Midnight Matinee and more Sci-Fi

Sci-Fi adds Space: 1999, UFO, The Fantastic Journey, Logan’s Run (TV series), Space Academy, and Jason of Star Command. The bounded search adds 130 metadata/HTTP-checked entries; Space Academy currently has only entries 1, 2, 3, and 8, and Jason includes short chapters as well as longer episodes.

**Midnight Matinee** is a separate library section under Sci-Fi and the mixed library. Choose **Random movie stream** for films only, or browse sources and the wishlist. Five checked feature-length sources are seeded; five requested classics without seeded sources remain visible wishlist entries. Films stay out of normal TV mixes and tuning-dial choices. The regular stream selector can explicitly select Midnight Matinee, and New mix reshuffles it. Commercials remain optional and play between films. See [coverage, provenance and rotation rules](../docs/20/MIDNIGHT-MATINEE.md).


## Catalog integrity

Owner catalog writes use one authoritative IndexedDB record containing the catalog and its revision. Each readwrite transaction compares the draft revision with the fresh saved record before replacing it. Updated tabs cannot silently overwrite each other. A conflicting change remains available in its form and as an exportable catalog draft. A storage-change warning never reloads the page automatically; explicit reload warns that open forms and drafts will be discarded. The first owner record imports the legacy browser catalog only if no IndexedDB record exists, inside the same record-creation transaction. Legacy localStorage remains untouched. Older app tabs may still edit their separate legacy copy; those edits are not imported again automatically. BroadcastChannel and focus checks provide warnings; correctness comes from the transaction, not notification timing.

If IndexedDB is unavailable or denied, the saved owner catalog is read-only. Playback, export, and tuning remain available; tuning changes are temporary for that tab. There is no localStorage compare-and-set fallback. The owner catalog record is transactional. Separate preference markers are not part of that transaction; no cross-store transaction with legacy localStorage is claimed.

Owner removal records episode/source exclusions inside the same catalog value. Automatic discovery-pack updates respect them, including matching titled, explicitly numbered episodes whose source URL changes. Unknown-order episodes match by source URL. Explicitly adding the removed source through the owner editor or a custom batch restores it; other exclusions remain. Old version-1 catalogs without exclusions continue to import/export. Exclusions cannot reconstruct deletions made before this release.

Library revisions cover discovery files, complete seed data and an explicit migration version. Migration changes require increasing `LIBRARY_MIGRATION_VERSION` in `scripts/library-revision.mjs` and rebuilding the library. Additive updates preserve existing sources and settings; they do not remove retired provider URLs automatically.

`npm test` includes catalog-integrity regressions. The optional real-browser regression is `test/browser-catalog-integrity.mjs`; pass an installed Playwright module path as its first argument and, optionally, a Chromium executable path as its second argument. It starts its own loopback server, mocks discovery responses, queues two form saves behind a held IndexedDB readwrite transaction, and verifies conflict recovery, public-view restrictions and the read-only fallback. No provider media or production services are called.


## Shared catalog and owner publishing

The shared master is a JSON catalog in S3, separate from the web page. Immutable snapshot files use `data/catalogs/<sha256>.json`; `data/published-catalog-manifest.json` selects the current published snapshot. The public viewer reads that manifest first and verifies snapshot bytes against its digest. The HTML contains the player and controls, not the master show definitions. A SQL database is not required for this single-curator workflow.

Start the local owner application with **Start YATA Owner.command** in the repository root, or run `npm start` from `nostalgia-tv`. Open `http://127.0.0.1:4173` yourself; the launcher does not open a browser. Existing local drafts are preserved. Use **Add a show**, source editing, or seeding to prepare a draft. **Review publication** displays the frozen catalog changes; **Confirm publication** publishes them. Saving local edits invalidates an earlier review. Publication requires configured local AWS CLI credentials and deployment configuration; no public password or query flag grants owner access.

**Load shared catalog** reads through the protected loopback publisher endpoint. It warns before replacing an owner draft. Export local edits first to retain them. Visitor pages expose watching, tuning and sharing, plus a read-only backup export for a pre-existing browser catalog; they cannot author or publish shared content.

Public pages never overwrite `drew-tv.catalog.v1`. That legacy draft remains recoverable even if it contains unpublished personal shows. Visitor preferences use `yata.viewer-settings.v1`; open tabs retain independent tuning state without owner-catalog conflicts. Published content is held in memory and the browser’s immutable HTTP cache; a new page verifies the snapshot before using it. New editions replace source definitions while preserving valid tuning preferences and current playback. Visible pages check for updates every 60 seconds and on returning to the tab; **Refresh shared catalog** checks immediately. A fresh public load requires a verified published master; read failures show retry without exposing factory source playback. Refresh failures retain the already verified in-memory edition and current playback. Shipped-pack fallback is limited to the local owner workflow. Legacy private sources never become the public master.

The optional `test/browser-published-catalog.mjs` accepts the same Playwright-module and Chromium-executable arguments as the integrity browser regression. Mocked cases cover legacy recovery, authoritative startup despite a matching legacy revision flag, independent public tabs, snapshot updates/failures, owner show creation, frozen review/confirmation, and protected same-origin shared loading.

## Comedy

Channel 05 mixes Barney Miller, Mork & Mindy, and The Love Boat. These series also participate in the all-show YATA mix. The reviewed initial source set contains 1, 24, and 4 full-episode candidates respectively; metadata and successful video HTTP range checks do not establish complete-series availability or browser decoding. Love Boat story excerpts are excluded. Refresh the selected source metadata with `node scripts/comedy-discovery.mjs`, then rebuild the library.

## 70s Prime Time

Channel 06 mixes checked Baretta and B.J. and the Bear entries and includes Barnaby Jones as a wishlist show. The initial set contains 58 Baretta and 12 B.J. entries. The bounded search found no eligible English Barnaby file; its external provider listing is recorded in the discovery artifact. Missing episodes remain unknown. Recheck source availability with `node scripts/verify-seventies.mjs`, then rebuild the library. HTTP success does not establish browser decoding or rights status.

## TV Guide

Open **Guide** in the header or **TV Guide** beside Library. The two-hour grid uses your actual station clock, episode runtimes, shuffle settings and commercial breaks. Select a program for full details, then join the live program named on the button or choose **Start episode from beginning**. The live action names what is currently playing, even when the selected listing is in the future. Starting an episode retains its position in the station queue. Browsing tabs leaves current playback running.

On a phone, swipe the grid horizontally; channel names remain visible. Earlier/Later browse other windows and Now returns to the current time. This is your personal station schedule, not a provider broadcast listing. Films remain in Midnight Matinee. Wishlist and unchecked sources stay in Library. Full-channel guide rows do not inherit a selected single-show stream.

The optional `test/browser-tv-guide.mjs` takes an installed Playwright module path and optional Chromium executable. It uses provider stand-ins for repeatable playback wiring checks. See [TV Guide specification](../docs/22/SPEC.md).

The compact remote beneath the TV provides channel keys and **SET UP**, which opens stream, commercial and TV-effect options in an overlay. Escape, Close or Done returns to watching. Old browser catalog backup export is tucked into **Previous browser backup** in the footer. In desktop Guide mode, the TV stays beside the schedule while scrolling. Use **Fill window** to expand it and Escape to restore it. On narrow screens, the TV sits above the guide.

The visual palette uses walnut surfaces, warm ivory listings, burnt-orange actions and muted olive controls. Amber is reserved for remote channel numerals and hardware selection indicators.

### Personal channels

Use **MAKE A CHANNEL** on the remote to ask a randomly assigned television host for a lineup. Request shows, themes, or moods; review the suggested checked shows before tuning. **Different host** switches presenters. The personal mix uses existing playback, shuffle, and commercial controls, while TV Guide retains its full-channel schedules. Selecting an ordinary channel or a specific show leaves the personal mix. The AI cannot publish shows or add video sources.

The planner uses the existing guarded AI backend and shared quotas. Browser verification may appear in the dialog. Verification grants remain in memory, and channel preferences stay separate from the owner-published catalog. Portrait credits are linked beside the host.

## Late Night

Channel 07 mixes original-era late-night animation and also participates in the main YATA shuffle. Cartoon Planet, early Aqua Teen Hunger Force (seasons 1–5), classic Beavis and Butt-Head, The Maxx, and the 1994 animated Tick have checked Archive video sources. Space Ghost Coast to Coast currently uses its shorter 2006–2008 GameTap interviews, labeled individually. Squidbillies and Robot Chicken have official Adult Swim episode links that open externally; those pages do not enter the live schedule. Region or provider restrictions may apply. Source checks are bounded availability samples, not a completeness or rights claim.

## Network expansion and vintage bumps

You Can’t Do That on Television and Turkey Television are in Comedy, with source recordings left intact. Their embedded commercials cannot be disabled by the optional-break setting. The first recommendation batch adds Harvey Birdman, Sealab 2021, Home Movies and The Brak Show to Late Night; Taxi and WKRP to Comedy; The Rockford Files to 70s Prime Time; The Bionic Woman to Action Adventure; and Josie and the Pussycats to Saturday Morning. Daria remains a wishlist entry because the bounded search did not produce an accessible full-program MP4.

Adult Swim and Nickelodeon bumps are separately labeled collections of short break clips. With breaks enabled, Adult Swim bumps join Late Night breaks; Nickelodeon bumps join Saturday Morning and the two Nickelodeon comedy shows. Both pools participate in the main mixed channel. The existing optional-break toggle disables inserted bumps and commercials together. Whole bumper montages are excluded. Source and exclusion details are recorded in `data/network-expansion-discovery.json`.

## Additional classic sitcoms

Fat Albert and the Cosby Kids joins Saturday Morning. Good Times, The Jeffersons, Sanford and Son, Gimme a Break!, and Welcome Back, Kotter join Comedy and the main shuffle using checked Archive program sources. Collection coverage varies; Sanford and Son and Kotter are partial collections. Who’s the Boss? is an official external Tubi series link and does not enter automatic playback. BraveStarr retains its existing catalog entries. Source provenance and exclusions are recorded in `data/classic-comedy-discovery.json`.
