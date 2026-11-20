# Onn TV preview review — 2026-11-19

## Result

Separate TV preview implemented and emulator-smoke-tested. Physical onn compatibility remains unverified. This does not close GitHub #43.

## Phone isolation

Default phone manifest, main Java/resources, runtime.mjs, navigation.mjs, controls.mjs and android-build.mjs have no diff against origin/main 1b5ffad. The shared Gradle file selects TV source sets and application ID only with explicit -PyataTv. TV output and project cache are separate. TV and phone can use distinct package identities; no existing physical-device installation was touched. Both builds passed, including switching TV to phone without cleaning after the cache isolation fix. APK inspection confirms phone com.doctorew.yata has no Leanback launcher, TV banner, TV module or stylesheet. TV uses com.doctorew.yata.tv and has the TV launcher/banner. Shared public feeds can naturally change bundled catalog bytes between builds; byte-identical APKs are not claimed.

## Executed checks

- npm test: 299 passed, zero failures.
- browser-tv-remote.mjs: passed focus geometry, hidden/disabled exclusion, modal containment/return, text input editing, scroll and removed-element recovery.
- browser-tv-shell.mjs: passed actual shared shell Watch/Guide/Library routing, horizontal nav tabs, More dialog and Back return. External traffic blocked; this check makes no playback claim.
- Android phone and TV debug package builds: passed. Final TV SHA-256: f256e51e3c471bd57d28e7b2ce106b239eba15f59406d95ccc292b2571172754.
- Owned YATA_TV_API34 emulator: Android 14, ARM64 Android TV image revision 3, WebView 113.0.5672.136. Installed/started com.doctorew.yata.tv successfully. Native D-pad/Select reached Watch, Guide and Library; native Back closed More and restored its trigger focus. Catalog completed loading. One direct video reached readyState 4 and playback time advanced from approximately 2505 to 2537 seconds; no video error observed. Final rebuilt APK was reinstalled and routing/modal smoke checks repeated.
- Existing browser-tv-guide.mjs failed: episode-actions modal intercepts pointer click on data-guide-play. Reproduced unchanged in detached origin/main worktree. This is a known failing baseline check, not passed coverage.
- git diff --check: passed.

## Limits and next tests

No physical onn test, complete provider matrix, caption/seek validation, controller/Arcade certification or Google Play submission. Text entry is browser-tested but the physical remote/IME still needs assessment. TV companion handoff returns an explicit unavailable error because shared return URLs target the phone scheme; this preview registers no competing deep link. No AI verification or catalog-integrity checks were removed.

Security/maintenance review: candidates come from existing rendered controls; no model-generated navigation URL. TV dependencies reuse the existing native bridge. The TV entry imports the shared runtime before installing its TV-only behavior. Generated TV assets are erased/rebuilt within their dedicated ignored directory, never committed. APKs remain ignored; any distribution must be a separately labelled TV prerelease, never the phone release asset.
