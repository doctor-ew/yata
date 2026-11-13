# YATA — Yet Another TV App

A personal nostalgia TV station with a retro channel guide, a curated show library, and media that plays from its original provider.

## Hosted station

Open **https://doctorew.com/tv/**. This static deployment uses the existing S3 bucket and CloudFront distribution. Catalog installation and provider playback run in your browser; no media is rehosted. Browser storage is separate from localhost and other devices. Use catalog export/import to transfer personal edits.

The hosted importer supports the curated library, Archive metadata discovery and direct YouTube video/playlist playback. Expanding arbitrary YouTube playlists into individual entries requires the local importer. Deployment details and update commands are in [the AWS deployment guide](../docs/4/DEPLOYMENT.md).

## Run locally

Requirements: a current Node.js installation and a modern browser. No package installation, account, or API key is required.

From this repository's root:

```sh
cd nostalgia-tv
npm start
```

Open the printed address: <http://127.0.0.1:4173>. Keep the terminal running. Press Ctrl+C in that terminal to stop the station. If the port is occupied, run `PORT=4174 npm start` and use the new printed address. This command does not operate the native Floating Browser app.

The preview started during this session runs independently of the chat terminal through the per-user macOS job `com.drew-tv.local-preview`. To stop that preview before starting a manual server on the same port, run `launchctl remove com.drew-tv.local-preview`.

## Random continuous streams

The three channel buttons are random streams by default: **Saturday Morning** mixes the checked cartoon shows, **Action Adventure** mixes action shows, and **YATA** mixes everything. Choose a channel and **Tune in live**, or use **New mix & play** for a fresh shuffle starting now.

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

The catalog and channel settings are saved in this browser's local storage under `drew-tv.catalog.v1`. Guest/private browsing or clearing site data can discard them. **Export catalog** downloads a JSON copy; **Import catalog** validates the complete file before replacing the current catalog. Imports are limited to 2 MB, 100 shows, 5,000 episode items, and 20 sources per episode. Export before removing items or replacing a catalog if you want a restore point.

A version-1 catalog contains:

- `epoch`: a station start time in Unix seconds.
- `settings`: selected `channel` (`mixed`, `action`, or `cartoons`), boolean `bumpers`, `rotation` (`random` or `ordered`), integer `shuffleSeed`, `storiesPerTurn` (1–3), and `streamShow` (a show ID or null). Older catalogs receive random-mode defaults when these fields are absent.
- `shows`: unique `id`, `title`, `channel` (`action` or `cartoons`), optional `imdbUrl`, and `episodes`.
- Episodes: unique `id`, `title`, `season`, `number`, `durationSeconds` (positive number or null), `group`, `kind` (`episode` or `bumper`), and `sources`.
- Sources: `id`, `provider` (`archive`, `youtube`, or `tubi`), HTTPS `url`, and `availability` (`verified` or `unverified`). A checked source can still become unavailable later.

Changes made in one browser profile are not automatically synchronized to another browser, device, or simultaneously open tab. Use export/import to move a catalog. Media remains at its original host; this app does not proxy, download for offline use, extract streams, or rehost it.

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
