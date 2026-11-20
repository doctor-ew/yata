# Onn Android TV first milestone

Status: implementation started; not a TV release. Upstream: [GitHub #43](https://github.com/doctor-ew/yata/issues/43). Local ledger: yata-ekp. Branch: feature/43-onn-android-tv, based on main 1b5ffad.

## Intent and scope

Make YATA usable from the couch with the onn remote. The existing issue identifies an onn Full HD streaming device running Android TV OS 14; that is reported context, not device verification. Deliver a sideloadable test APK and a device-specific evidence report before considering Google Play publication. Preserve the phone client and the authoritative shared catalog.

The initial experience covers launch, guide/library, show and episode selection, playback controls, search and safe return navigation. The upstream issue also requires companion request and verification-flow evaluation. Full buddy text-entry UX and Arcade/controller scope remain open questions; launcher work does not depend on those answers. Fire TV, Roku, Vizio, casting and phone pairing remain separate milestones.

## Verified starting points

- `mobile/android/app/src/main/AndroidManifest.xml`: ordinary phone launcher, Internet/media service permissions, yata deep link and existing icon. Before this branch it had no Leanback launcher or TV feature declarations.
- `mobile/android/app/src/main/java/com/doctorew/yata/MainActivity.java:7`: Capacitor activity registers CatalogPlugin and BackgroundAudioPlugin; no bespoke remote dispatch implementation.
- `mobile/android/app/build.gradle:4`: package com.doctorew.yata; shared Android application, Media3 dependencies and version 0.8.21/32.
- `mobile/build.mjs:6`: published manifest and immutable snapshot are fetched and SHA-256 checked before bundling. Preserve this behavior.
- `mobile/android-build.mjs:4`: requires JDK 21; line 5 checks Android platform 36. `mobile/android/variables.gradle:3` defines compile SDK 36.

## Architecture decision

Extend the Android client rather than fork the catalog or introduce a new backend. Keep Leanback optional so phones remain eligible; declare touch optional and add the TV launch category and a banner derived from the existing Android mark. This first patch only enables launcher discovery. It does not establish remote usability or Play eligibility.

The next implementation slice must detect television mode through the native UI-mode API, expose that bounded capability to the local shell, and apply a TV layout without changing the phone layout. Choose explicit focus ownership for the guide, library, episode list, dialogs and player. Avoid a global key handler that steals text-entry, media or embedded-player input. Restore focus to the triggering control after closing a panel; Back closes the active panel before leaving the screen. Confirm Capacitor lifecycle and bridge APIs against installed source before coding that slice.

Reuse public catalog and buddy metadata contracts, integrity checks and cached fallback. Compatible content additions should not require a new APK. Native features and incompatible schema changes still need client releases. Never publish a generated seed over the live catalog. Keep AI verification, finite action/ID routing and embedded Arcade network restrictions intact.

## Acceptance criteria

1. The installed APK appears once in the TV launcher with readable YATA artwork and launches without touch. The phone launcher and yata deep link still work.
2. Using only D-pad, Select and Back, a tester can traverse guide/library, select a show and episode, tune and return without a focus trap. Focus is visible at TV viewing distance and restored after dialogs.
3. Supported sources play on the named onn device; pause/resume, seek and available captions are remote-operable. Record provider-specific failures; never imply browser-embed compatibility from direct-video success.
4. Search has a remote-operable input path. Companion verification either works through the protected existing flow or gives a clear unavailable state; no bypass or new pairing protocol is implied.
5. Remote catalog refresh and cache fallback preserve saved settings and integrity validation. Production content need not be changed to test this.
6. Phone launch/navigation remains functional. No Apple source, production catalog, credentials or media binaries enter this change.
7. A test APK is distributed through GitHub Releases only after a successful package build and bounded remote smoke test. Publish model, OS, WebView, build identifier and observed limitations with it. Store submission is separate.

## Verification and delivery sequence

Stage 1: launcher declarations and artwork; compile Android resources and build the existing package. Stage 2: TV-mode layout, focus/Back handling and remote-only emulator tests. Stage 3: physical onn playback, controls, search, companion verification, refresh/offline and phone-regression checks. Stage 4: version/changelog/release notes, test APK and device evidence. Do not mark this issue complete after stage 1.

Current evidence (2026-11-19): AAPT2 35.0.0 compiled the banner successfully; git diff --check passed. Full android-build.mjs attempt failed before packaging because its JDK 21 was absent. SDK inspection also found only platforms 34 and 35, not required platform 36; the expected cmdline-tools directory is absent. No APK, emulator run or physical onn test is claimed. Restore the required local toolchain before package validation. Do not lower project SDK levels to conceal the environment gap.

### Toolchain recovery and package validation

On 2026-11-19, installed the build script's exact Temurin 21.0.13+9 LTS with mise. Restored Google's macOS ARM64 command-line tools (archive SHA-1 checked against Google's repository metadata), platform android-36 and Build Tools 36.0.0 in the existing user SDK. Android Studio was not reinstalled and the global Java default was not changed.

Retried `mobile/android-build.mjs`: BUILD SUCCESSFUL, 183 tasks executed. Produced local ignored artifact `mobile/artifacts/YATA-0.8.21-android-debug.apk`. This resolves the earlier toolchain blocker; it does not establish remote navigation or physical-device compatibility. No APK was published or installed on a device.

## References

- [Android TV setup, launcher, optional features and banner](https://developer.android.com/training/tv/get-started/create)
- [Android TV quality requirements](https://developer.android.com/develop/adaptive-apps/quality-guidelines/tv-app-quality)
- [Upstream scope and reported device](https://github.com/doctor-ew/yata/issues/43)

Rollback: revert the launcher declarations and banner together; no data migration or public service change is involved.
