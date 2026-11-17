# Random stream validation

Date: 2026-11-13.

## Automated checks
40 tests passed. Added checks cover deterministic regeneration and clock lookup through serialization, seed changes, balanced show rounds, complete episode-pool coverage, per-pool uniqueness, genre/show scope, unknown/unchecked source exclusion, multipart adjacency, bumpers, two/three-story turns, mid-turn small-pool reshuffles, legacy migration, settings persistence and validation. Existing provider playback, navigation, artifact, server and static-package tests remain passing.

The catalog baseline remains 1,889 items with 1,795 unique metadata-ready items. A random schedule can have more slots because shorter show pools cycle to retain balanced turns; ready counts use unique episodes rather than repeated slot count.

## Browser observations
An isolated Chrome window loaded the local app with a fresh catalog:
- Random rotation was selected by default; the all-show guide mixed action and cartoon shows.
- Selecting Saturday Morning restricted the upcoming guide to cartoon shows and displayed 847 checked items.
- Opening He-Man and selecting **Shuffle this show** set the saved stream selector to He-Man and started an Archive episode, The Time Wheel (source S02E34).
- Actual player state reached `PLAYING · ARCHIVE`; all visible upcoming guide entries were He-Man.

A later UI navigation action was interrupted when the user changed the active browser application. No successful browser Next/refresh-persistence test is claimed in this run. Queue navigation and saved-state regeneration are covered by automated checks.

## Independent review
Review found that changing bumpers could invalidate the active queue predecessor. Bumper changes now reconfigure the stream. Navigation additionally remaps an existing episode after a catalog edit changes its predecessor. The known finite-loop pool boundary is documented; no unlimited non-repetition guarantee is claimed.

## Scope
The OTR reference checkout and installed native Floating Browser were not modified or operated. The app remains static on S3/CloudFront; source availability and provider playback limitations are unchanged.

## Publication receipt
Published at `2026-11-13T19:29:46.238Z` to https://doctorew.com/tv/. All 17 live release objects matched their package SHA-256 digests and MIME types. CloudFront invalidation `IAK3QUG55ISMQI9L355JTD4IBD` completed. The unique catalog inventory remains unchanged.
