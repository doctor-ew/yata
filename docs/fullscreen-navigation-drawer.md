# Native fullscreen navigation drawer

Status: prepared in source, not released or installed. The viewer identified YATA’s Watch / Guide / Library bar as the obtrusive bottom navigation on Android.

During YATA fullscreen, `mobile/fullscreen-navigation.mjs` moves only the navigation element into the fullscreen screen container and collapses its links behind a 48-by-44-pixel up-arrow button. Tapping reveals the existing links; tapping again collapses them. The button has an accessible name, expanded state, control relationship and focus outline. Exiting fullscreen restores normal navigation at its previous DOM position. The player stays in place. Existing system-bar hiding and playback controls are unchanged.

Fresh validation: 310 unit tests passed, including the drawer lifecycle regression; mobile web assets built successfully against the hash-verified published catalog; static build completed as part of that mobile build. A headless Chromium touch-landscape fixture verified arrow visibility and bounds, expanded links, collapse, normal navigation restoration, and unchanged video identity. This fixture is not an Android WebView or device playback test. No APK was built, released or installed, and no web deployment was performed for this fix.

The branch builds on the catalog publication work in PR #53. The unchanged published 0.8.22 release notes do not claim this fix has shipped. CHANGELOG.md records it under Unreleased.

Pensieve remains unauthenticated in this cloud environment. No remote memory receipt exists for this fix. After authentication, publish a sourced update describing the prepared navigation drawer, the validation limits above, this file and the repository commit. Also retry the prior catalog publication update from docs/catalog-updates/2026-11-21-cult-tv-published.md. These local handoffs are not completed remote updates.
