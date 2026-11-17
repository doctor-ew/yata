# Episode deep links

## Scope

Implements [issue 16](https://github.com/doctor-ew/floating-browser/issues/16). **Share episode** copies a link to the currently selected provider source. **Include position** adds the current playback second for individual videos. Library rows also share from the beginning. Clipboard failure offers a dialog for selecting and copying the URL manually.

Links use the static page URL with fragment parameters `show`, `source`, and `t`. Source URLs are canonicalized through the existing provider allowlist; links do not depend on per-browser episode IDs. Recipients resolve the source after the library loads and receive an episode banner with an explicit Play action. A source missing from their catalog offers Open original rather than silently inserting new catalog data. Normal anchor links remain supported. Fragment values are not sent to S3, and social previews remain the general YATA page.

## Input handling

Supported sources are Archive MP4, YouTube video/playlist, and external Tubi URLs. Archive collection URLs are rejected. Timestamps are finite, bounded to 0–86400 seconds and floored to whole seconds. Duplicate, unknown or malformed fragment parameters, unsupported schemes and invalid identifiers are rejected. Titles are rendered as text, and external links use noopener/noreferrer. No shared link automatically starts a provider video.

## Validation

Five focused helper tests cover round-trip/canonicalization, hostile inputs, timestamps, cross-browser identity and catalog lookup. The full release passes 83 tests. Isolated headless Chrome confirmed a timestamped link opens in a fresh profile, resolves the correct episode, waits for Play, shares its current timestamp, and offers a safe fallback for unknown custom sources. Synthetic local MP4 fixtures exercised browser seeking and range responses; those tests do not establish every third-party provider’s availability or decoding. Malicious scheme input did not create a shared player.

The clipboard fallback dialog is mounted within the player region so it remains usable in Fill window mode. Its Escape/Tab events stay with the native dialog; closing the copy dialog does not exit window mode. Shared timestamp playback displays the requested starting time.
