# YATA iOS and tvOS handoff

Updated: 2026-11-20. Repository: https://github.com/doctor-ew/yata

## Objective and current state

Build and test iPhone/iPad on the personal Mac with Apple signing already configured. Establish an Apple TV implementation separately. The existing iOS project has not been compiled or tested in this checkout; no TestFlight upload is verified. Do not describe Android results as Apple device results.

The shared frontend is JavaScript, packaged with Capacitor 8.6.2. Porting it all to Swift is unnecessary for the existing iOS app. The repository contains an iOS target and Android target, but no tvOS target. `mobile/ios/App/CapApp-SPM/Package.swift` declares iOS 15 and no tvOS platform. Capacitor officially supports Android, iOS and Web; use a separate native SwiftUI/AVKit tvOS client sharing the public data contracts rather than assuming the iOS wrapper can run on Apple TV.

## Latest changes to bring over

Pull current `main` before building. Version 0.8.22 adds a remotely delivered channel registry and Game Shows channel 11. Bring over `mobile/ios/App/App/SceneDelegate.swift` with its explicit v3-manifest allowlist entry, then rebuild/sync using `mobile/build.mjs` to bundle the verified current registry snapshot. Test remote additions, offline bundled launch, mix opt-outs, guide/library/remix controls and shared channel links. Future compatible ordinary channels arrive as data. No Apple build or device validation is claimed for this release. See `docs/channel-registry/ARCHITECTURE.md`. Version 0.8.21 adds the typed Jev intent fallback, verified-origin native intent transport, visible version label, companion search/sort, Krystal profile, and an inset contained video viewport. Rebuild the iOS assets for these UI/bridge changes; server data updates alone cannot add them. Version 0.8.20 fixes channel-command routing and retains a pending channel request when the buddy asks what to include. The backend accepts the current 259-show offer under the existing request-byte caps. The 0.8.21 shared frontend replaces the rejected repeating SVG texture with original animated monochrome snow frames and a hard cut, without a dissolve. Loading and channel changes share the same GIF; the former loading SVG is removed. The saved Static switch, zero strength and accessibility preferences suppress both layers. It retains render-frame timing and synchronized tuning sound, plus Enter-to-send / Shift+Enter newline in buddy chat. It removes the hardcoded show-comparison shortcut: descriptive requests now use the guarded AI planner with current catalog offers. Non-matching episode candidates can be offered as clearly labelled alternatives, requiring selection. It includes the 0.8.13 channel-tuning feature and fixes its Guide/Library/buddy playback paths. Episode requests now take precedence over show-channel playback; explicit-series searches cannot silently substitute another series. The server-side corpus now contains 4,192 sourced episode summaries across 114 series, including Knight Rider and The Greatest American Hero. Unsupported matches leave playback unchanged; ambiguous matches require a selection. The shared frontend adds short channel-change TV snow, an optional procedural tuning hiss/click and a 240 ms default tuning length. Saved tuning durations remain respected. Visual effects respect static-off, zero strength, reduced motion and forced colors. Sound follows its own channel/dial setting, volume and mute. Source loading/buffering still has its separate bounded tuning overlay. Both clients must use the same transition implementation and avoid artificial playback delays.

Changes since the early native builds also include:

- Watch/Guide/Library navigation; More groups secondary controls, sharing, mix/remix, appearance and privacy.
- Vintage room rotation/pinning, insignia decals, bundled Cabin/Fraunces fonts, CRT/static controls and original-series library artwork. No AI imagery for shows or companions.
- API-driven catalog, artwork, Arcade metadata and buddy presentation feeds with validated cached/bundled fallback. Preserve the immutable-catalog SHA-256 verification. Never replace the published snapshot with the seed.
- Saved Channel 00 episode queue: play now, play next, append, reorder, remove and local resume. Persistence remains device-local. Queue sharing/watch-together and Plex are future work.
- Pause/resume checkpoints and initial-seek correction; browser page-cache restoration. Physical iOS verification remains required.
- Episode browsing by title/story and season; cross-library title search; sourced descriptions and available provider captions. Plot retrieval is guarded and source-backed, with 4,192 summaries across 114 series. Coverage is partial; named-series candidate lists are bounded and broad unnamed questions have lower recall. Full scripts, arbitrary episode plots, exact quotes and scene timestamps are not covered.
- Moderated, finite-identity companions with character selection/pinning, rotating local hover notes, sourced episode-search results, in-chat channel creation and finite game-name routing. Web AI verification is retained through native handoff, not bypassed for localhost.
- Chat-first requests/bugs prepare GitHub issue drafts for viewer review; no SES email or automatic issue submission.
- Aggregate privacy-controlled analytics, with no chat text or persistent viewer ID; foreground watch time excludes native background audio. Respect opt-out, DNT and GPC.
- Hidden Arcade Channel 03, Konami entry via logo touch controls or buddy text, and pending-game deep linking after unlock. Classic games appear before the optional Adult Swim shelf. Arcade remains hosted; games are not bundled in the APK/iOS project.
- Series rating references where sourced; unknown content stays Unrated. Existing ratings are neither per-file classifications nor parental-control enforcement.

The remote buddy roster has 54 entries. Recent additions: Punky, Clarissa, Vicki, Maude, Dorothy, Rose, Blanche, Sophia, original Firefly, Junior Wetworth, Brainy Smurf, original Frank Drebin, Les Nessman, Mrs. Roper and original Jonny Quest Bandit. Junior is the orange Snork requested; Allstar was not added. New approved presentation profiles arrive remotely; new native capabilities still require a build.

The current public catalog has 269 shows, 12,507 entries and 12,821 sources. Recent additions include 72 original live-action Swamp Thing (1990) entries, 55 Beauty and the Beast (1987) entries, Punky Brewster, Clarissa, Ramona, Snorks, Captain Planet, Road to Avonlea, Pinwheel and the five-series cartoon wave. That wave adds 17 Harlem Globetrotters episodes, 24 New Scooby-Doo Movies, two English Super Globetrotters, 40 uploader-labelled Bananaman shorts and 17 intact original George/Super Chicken/Tom Slick programs. Bananaman guide/upload numbering differs; preserve that documented discrepancy. The original BSG pilot is already a combined Parts 1–3 entry, approximately 2h19m.

## iOS work tonight

1. Install/select full Xcode meeting Capacitor 8's documented Xcode 26+ requirement. Check the personal Mac's tools and signing team; this checkout does not verify that machine's setup.
2. In `mobile`, run `npm ci`, then `npm run build`, then `npx cap sync ios`. `npm run ios` opens the project. Review changes from Capacitor sync before committing; do not overwrite custom `SceneDelegate.swift` bridge code.
3. In Xcode, configure signing and distribution for the existing bundle identifier `com.doctorew.yata`, or explicitly choose an available identifier and update all associated configuration. Existing project marketing/build versions remain 1.0/1; set appropriate release and monotonically increasing build numbers before archiving.
4. Confirm `YataCatalogPlugin` registration and its allowlist in `mobile/ios/App/App/SceneDelegate.swift`. It already permits both catalog manifests, immutable catalog snapshots, library artwork, Arcade metadata, buddy personas and bounded HTTPS Archive captions. Keep it narrow; do not turn it into a generic network proxy. Test fresh remote data, offline fallback and invalid responses.
5. Complete incoming links. Shared runtime listens for `yata:` URLs, but the current iOS `Info.plist` has no registered URL scheme. Configure the scheme for `yata://tv` return links and test cold/warm returns from buddy verification, channel creation and shared episodes/lineups. Preserve nonce/finite-ID validation. Universal links are separate work if selected.
6. Automatic Archive background audio requires Apple-native implementation. `mobile/controls.mjs` gates the current `YataAudio` lifecycle to Android; there is no Apple `YataAudio` plugin. Implement an Apple playback adapter, audio session/background capability, lock-screen/remote commands, interruption/route handling and position/queue restoration. Do not expose a new background-play button: handoff should happen naturally on background/screen lock, respecting pause. Keep YouTube in the official visible player; do not extract its streams.
7. Test physical iPhone/iPad: rotation/fullscreen, PiP, pause then return after screen lock, queue restoration, long episodes, captions, safe areas, share sheet, keyboard/chat, verified buddy return, remote-roster pin persistence, touch Konami and Arcade deep links. Test silent-switch/audio-session behavior for the optional tuning sound. Keep audio/visual settings independent.
8. Review App Store Connect app metadata, privacy disclosures, age questionnaire and content/provider permissions before submission. Add actual screenshots, support/privacy links and reviewer instructions for AI verification and hidden Arcade. Do not claim store approval from a successful archive.
9. Archive and upload using Xcode/App Store Connect on the signing Mac; inspect processing, then assign the processed build to the intended TestFlight group. Record actual simulator/device/TestFlight results separately.

## tvOS work tonight

Create a distinct Apple TV target/client. Reuse public catalog/artwork/buddy feed schemas, catalog hash verification, station-clock rules, finite playback IDs, backend policies and attribution. Do not copy credentials or inference tokens into a client.

Build a remote-first Watch/Guide/Library UI with focus, directional navigation, Menu/back and Play/Pause. Use native AVKit playback for supported direct Archive sources. Resolve YouTube, hosted Arcade and verified companion authentication as explicit provider/platform capabilities; browser-tab, touch and WebView flows from iOS are not a ready-made tvOS implementation.

Provide TV-appropriate companion selection and a Siri Remote Konami sequence. Keep unverified content unavailable rather than generating provider URLs. Retain settings, local queue/bookmarks, captions, ratings/Unrated labels and accessibility. Test foreground/background transitions and avoid focus traps in the guide/chat overlays. Prepare the tvOS app record, icons/screenshots, signing and TestFlight distribution only after an actual build exists.

## Verified references

- `mobile/build.mjs`: bundles the frontend and the current hash-checked public catalog.
- `mobile/runtime.mjs`: public-reader adapter, Browser/Share integration, finite Arcade/buddy handoff.
- `mobile/controls.mjs`: Android-specific native audio lifecycle and incoming URL handling.
- `mobile/ios/App/App/SceneDelegate.swift`: custom native reader.
- `mobile/ios/App/App/Info.plist`: Apple app configuration; scheme/background-audio work remains.
- `mobile/ios/App/App.xcodeproj/project.pbxproj`: existing version/signing settings.
- `docs/remote-buddies/ARCHITECTURE.md`, `docs/buddy-retrieval/ARCHITECTURE.md`, `docs/ANALYTICS.md`, `CHANGELOG.md`.
- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/updating/8-0

## Memory availability

The personal remote connection was refreshed on 2026-11-19. Both latest handoff parts and three previously held updates were confirmed saved in the private remote YATA pool; remote records were re-read to verify the older entries. The user requires remote Pensieve updates after changes. Local copies and held entries alone do not count as success. Do not store credentials in project files or memory.
