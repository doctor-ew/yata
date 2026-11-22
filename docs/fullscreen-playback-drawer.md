# Fullscreen playback control drawer

Status: prepared in source, not released or installed. The supplied Android screenshot identifies the bottom rewind / pause / forward / next strip as the obtrusive overlay.

`src/window-mode.mjs` collapses that playback strip whenever YATA fullscreen opens, including automatic landscape entry. A 48-by-44-pixel up-arrow button reveals the controls; its down-arrow state collapses them again. Hidden controls stay hidden even when touch hover remains active. Expanded controls reserve room for the arrow so it does not obscure playback buttons. Exiting fullscreen restores the original control visibility. The button has an accessible name, expanded state, control relationship and focus outline. No player element is moved or recreated. Watch / Guide / Library navigation and Android system-bar behavior remain unchanged.

Fresh validation: 310 unit tests passed, including the playback drawer lifecycle regression; mobile web assets built against the hash-verified published catalog, with a 530-file static build. A headless Chromium touch-landscape fixture verified collapsed visibility, button bounds, expanded playback controls, no arrow/Pause overlap, collapse despite hover, normal controls on exit and unchanged video identity. This fixture is not an Android WebView or device playback test. No APK was built, released or installed; no web deployment occurred for this fix.

PR #54 builds on the catalog publication work in PR #53. CHANGELOG.md marks this fix Unreleased. Published 0.8.22 release notes do not claim it has shipped.

Pensieve remains unauthenticated in this cloud environment. No remote memory receipt exists. Retain this update for retry after authentication: the Android screenshot identified the playback strip; PR #54 adds an explicit fullscreen playback drawer, verified with 310 tests, a mobile asset build and the browser checks above, with no device or APK release claim. Cite this report and its repository commit. Also retry the prior catalog publication update from docs/catalog-updates/2026-11-21-cult-tv-published.md. These local handoffs are not completed remote updates.
