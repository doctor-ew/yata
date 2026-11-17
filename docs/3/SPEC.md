# Expanded episode library

## Objective
Populate the requested nostalgia show library with matched public episodes across the action and cartoon channels. Replace sample-only availability with a curated, repeatable source discovery pack. Issue: [#3](https://github.com/doctor-ew/floating-browser/issues/3).

## Sources and evidence
Separate discovery workers examine Archive action collections, Archive cartoon collections and official YouTube metadata. Each discovery artifact records the time, inspected sources, per-show episode metadata, limitations and known gaps. Search hits are not imported solely because a title contains a show name. Reboots, clips, commentary, unrelated series, language mismatches and information placeholders are excluded where identified.

Public Archive MP4 metadata provides source links and available runtimes. Representative range responses and codec samples establish only the tested files' endpoint/stream properties. Official YouTube metadata remains unverified for embedded playback. No media is downloaded for offline storage or rehosted.

## Catalog installation
`nostalgia-tv/scripts/build-library.mjs` validates all three discovery artifacts, creates a portable catalog and writes a content-derived library revision plus per-show coverage report. This introduces:

- `nostalgia-tv/data/library-manifest.json`: content revision and counts.
- `nostalgia-tv/data/expanded-catalog.json`: validated portable catalog.
- `docs/3/COVERAGE.md`: generated per-show item, source and station-readiness counts.

On loading the app, the curated library is added once per revision. The new local-storage marker `drew-tv.library-revision.v1` records a successful installation. Existing catalog metadata, sources and settings are preserved. A damaged saved catalog is not overwritten automatically. Missing original show records are added when necessary; normal catalog limits still apply. Removing an item after installation does not cause it to reappear on every reload of the same revision.

Explicitly numbered episodes are combined as alternative sources only when normalized episode titles also agree. Provider numbering alone is insufficient: G.I. Joe's miniseries and regular season use conflicting numbering. Unknown seasons remain zero and are not merged by an invented order. Source URLs are deduplicated across the catalog. Validation or storage failure leaves the previous catalog intact.

## Review interface
**Fill all shows** opens whole-library review. Coverage entries allow selecting entire shows and display source notes. Episode details can be filtered by show and are paginated in groups of 50. Selection and edited values remain in the staged rows while changing pages. Approval performs the same additive merge against the latest catalog.

The existing manual Archive/YouTube importer and small starter pack remain available. Live scheduling continues to require a checked source and positive runtime; YouTube entries become eligible after successful official-player playback. Tubi is still an outbound source.

## Scope limits
The result is a bounded public-source inventory at the recorded time, not proof that every worldwide episode or every language version has been found. Counts reflect discovered files and conservative source matching, not an independent broadcast episode guide. Gaps and source-order qualifications remain explicit. No native browser changes, upstream PR, merge or production deployment are included.
