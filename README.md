# Drew TV

A personal nostalgia TV station with a retro channel guide, a curated show library, and media that plays from its original provider.

## Run locally

Requirements: a current Node.js installation and a modern browser. No package installation, account, or API key is required.

From this repository's root:

```sh
cd nostalgia-tv
npm start
```

Open the printed address: <http://127.0.0.1:4173>. Keep the terminal running. Press Ctrl+C in that terminal to stop the station. If the port is occupied, run `PORT=4174 npm start` and use the new printed address. This command does not operate the native Floating Browser app.

## Watch

- Select Drew TV, Action Adventure, or Saturday Morning.
- **Tune in live** joins a checked episode at the position calculated from your station clock. **Start from beginning** starts the selected episode at zero.
- **Next episode** advances to another checked item, if available. Playback failure offers a deliberate Retry, Skip, or Original source action; it never retries indefinitely.
- The Library includes all requested shows, including those with no added episode sources. A show card opens its episode/source list.
- The initial live rotation contains the supplied Dukes of Hazzard episode. It loops until more checked sources are added. The supplied Saturday Morning Simulator link is retained as a compilation with unchecked YouTube playback. The G.I. Joe miniseries episode opens on Tubi.
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

## Catalog storage

The catalog and channel settings are saved in this browser's local storage under `drew-tv.catalog.v1`. Guest/private browsing or clearing site data can discard them. **Export catalog** downloads a JSON copy; **Import catalog** validates the complete file before replacing the current catalog. Imports are limited to 2 MB, 100 shows, 5,000 episode items, and 20 sources per episode. Export before removing items or replacing a catalog if you want a restore point.

A version-1 catalog contains:

- `epoch`: a station start time in Unix seconds.
- `settings`: selected `channel` (`mixed`, `action`, or `cartoons`) and boolean `bumpers`.
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

Tests use Node's built-in test runner and local provider stand-ins. No provider credentials or live playback are required to run them. See [the specification](../docs/1/SPEC.md) and [validation report](../docs/1/VALIDATION.md) in the repository for task scope and observed results.

## Attribution

This companion is part of [doctor-ew/floating-browser](https://github.com/doctor-ew/floating-browser), based on Floating Browser by Chris Hansen. The original copyright notice and MIT license remain in the repository root.

Channel scheduling was inspired by [Old Time Radio by Rob Dawson](https://github.com/codebox/old-time-radio). This companion was independently implemented; no radio implementation code was copied. Show names identify their respective series. Media is served by Internet Archive, YouTube, or Tubi, and this project is not affiliated with those services or the listed shows.
