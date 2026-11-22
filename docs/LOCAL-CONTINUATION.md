# Continue YATA locally and publish the Pensieve handoff

Prepared November 22, 2026. This is a repository handoff, not a confirmed remote Pensieve save. The cloud MCP connection still reports `Not logged in`; no remote memory receipt exists. The user requested this summary so they can switch to the Mac, where Pensieve authentication previously succeeded and the Android phone is connected by USB ADB.

Repository: https://github.com/doctor-ew/yata. Working branch: `ticket/fullscreen-control-drawer`. Before this handoff, its head was `007f21bced7e9ac983c773fb0b8b65502feae570`. Fetch the branch and preserve any local changes before switching; do not reset a dirty checkout. This branch includes the published catalog work from `ticket/cult-tv-lineup`.

## Publish this summary to Pensieve first

Follow the installed Pensieve skill or inspect available MCP tool schemas. The [Pensieve repository skill](https://github.com/doctor-ew/pensieve/blob/main/skills/pensieve/SKILL.md) specifies `list_pools`, `save_memory`, `recall_memories` and `index_memories`. Resolve the user's remote YATA pool from the actual pool listing; do not guess its ID or substitute a local/private store. Save the selected handoff below with its source links. After saving, request indexing for the same pool, recall the saved handoff, and retain the actual remote receipt/memory ID. If authentication fails, report that blocker; do not claim a local file is a remote update. Never save credentials, callback codes or raw conversation history.

### Memory: published cult-TV catalog

The user approved and explicitly authorized live publication of 10 cult-TV additions: Firefly (14 entries), Garth Marenghi’s Darkplace (6), Lexx (61), The Mighty Boosh (20), Look Around You (14), The IT Crowd (24), Spaced (14), Metalocalypse (60), Frisky Dingo (24), and Monty Python’s Flying Circus (43). Total: 280 selected entries. These are partial selections, not guaranteed complete series. Space: 1999, The Venture Bros. and 15 other proposed shows were already present and were preserved. Snuff Box and Toast of London remain pending source verification.

Both feeds were published and read back successfully. Current totals: 351 shows, 14,263 entries, 14,577 sources. On November 22, a fresh read still matched the published revisions below. The catalog update is live even though source PR #53 is unmerged. Existing show records were unchanged. No APK was required for this content update.

- Current registry revision: `e6fcea9b8cae48d80eb226b34651cd79a0b4f96ccc15cbf73a659f77bf978023`.
- Older-app compatibility revision: `debb988b968553916da0cc54770dcc127c2dc000ee366b346d4391d829e4bf00`.
- Both immutable snapshots were uploaded conditionally, hash-verified through the public site, then published with ETag-conditional manifest writes. Release notes were also updated conditionally and read back.
- 196 Archive sources passed byte-range checks; 84 Adult Swim external episode links came from official non-authenticated metadata. Full decoding, distribution rights and all-region availability were not established. No new artwork was included.
- Publication verification at the time: 27 catalog tests, 2 release-note tests and static build passed. These are historical observations, not fresh checks in the receiving session.

Sources:

- https://doctorew.com/tv/data/published-catalog-v3-manifest.json
- https://doctorew.com/tv/data/published-catalog-v2-manifest.json
- https://github.com/doctor-ew/yata/pull/53 (open/unmerged when checked for this handoff)
- https://github.com/doctor-ew/yata/blob/ticket/cult-tv-lineup/docs/catalog-updates/2026-11-21-cult-tv-published.md
- https://github.com/doctor-ew/yata/blob/ticket/cult-tv-lineup/data/cult-tv-selections.json
- Source publication commit `8551de3bb9234b71f1d4a8d00e8742de605f949e`.

### Memory: Android fullscreen playback drawer, not released

The user's screenshot showed the bottom rewind / pause / forward / next strip covering fullscreen video. The requested fix targets that playback strip, not Watch / Guide / Library navigation or Android's system navigation bar. Final PR #54 implements a small up-arrow button on fullscreen entry (including automatic landscape entry); tap to expand playback controls and tap the down arrow to collapse. Exit restores the normal controls. Sticky touch hover cannot reveal hidden controls; expanded controls leave room for the arrow. The video/player DOM stays in place.

Final implementation commit: `007f21bced7e9ac983c773fb0b8b65502feae570`. PR #54 is draft/open/unmerged, based on `ticket/cult-tv-lineup` (PR #53), not directly on main. An earlier commit in the branch targeted the wrong navigation bar; that implementation was removed. Review the final diff.

Before this handoff: 310 unit tests passed; mobile asset build passed using the hash-verified published catalog; headless Chromium touch-landscape fixture verified arrow bounds, expanded controls, no arrow/Pause overlap, collapse despite hover, normal controls on exit and unchanged video identity. These checks do not establish Android WebView or physical-device behavior.

No new APK was built, released or installed. No web deployment of this fix occurred. App version remains 0.8.22 and the changelog labels the fix Unreleased. Do not describe the control fix as shipped.

Sources:

- https://github.com/doctor-ew/yata/pull/54
- https://github.com/doctor-ew/yata/blob/ticket/fullscreen-control-drawer/docs/fullscreen-playback-drawer.md
- https://github.com/doctor-ew/yata/commit/007f21bced7e9ac983c773fb0b8b65502feae570

## Continue device testing on the Mac

The user authorized trying the fix on their connected ADB phone. The cloud environment installed an ADB client but `adb devices -l` returned no devices. USB ADB connected to the Mac is not exposed to this cloud environment. Do not expose unauthenticated ADB to the public internet.

1. On the Mac, verify `adb devices -l` and select the intended authorized device. Resolve `unauthorized` on the phone. If several devices appear, select one explicitly.
2. Fetch this branch, inspect current instructions and preserve local changes. Inspect `mobile/package.json`, `mobile/android-build.mjs` and the native signing configuration before building. Do not overwrite signing keys or uninstall the existing app to work around a signing mismatch; preserve user data and report a mismatch.
3. Build updated mobile assets and a debug APK using the repository workflow, with the owner's existing signing setup and Android SDK/JDK. Building requires JDK 21 and Android SDK platform 36 according to the current script. Recheck actual requirements.
4. Install the APK as an update on the authorized phone and test the actual fullscreen view: strip initially collapsed, arrow reveals controls, down arrow hides them, Pause/seek/Next still work, playback doesn't restart, orientation changes behave, and exiting fullscreen restores controls. Verify controls remain reachable with touch and accessibility focus.
5. Report device model/OS, installed version/build/commit, installation outcome and actual test evidence. Do not report browser-fixture results as device tests. Any APK distribution belongs in GitHub Releases, never repository commits. A public release/version bump and changelog must reflect what actually ships.
6. Save the device-test outcome to the remote YATA Pensieve pool and confirm its receipt. Keep the pending catalog/control summaries distinct from any newly verified device results.

## Authentication context

Pensieve network access from cloud is allowed. Cloud OAuth was not completed: the approval link was opened in Zen on the Mac, and its loopback callback tried the Mac instead of the cloud listener; the listener later expired. Cloud browser automation also failed with a sandbox error. No credentials were copied between hosts. Mac Codex had previously reported successful Pensieve login; the receiving local session must verify by listing pools and recalling a known YATA memory. A successful CLI login alone does not establish the intended pool is accessible.

AWS Core was connected in this cloud chat and verified account `432230020714`; plugin access does not imply local CLI credentials exist. Do not republish the catalog merely to continue the Android UI fix.
