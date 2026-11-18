# Apple beta delivery

## Status

Updated on 2026-11-17 on branch `feature/apple-testflight`. App Store Connect app 6836149390, **Yet Another Television App**, contains iOS and tvOS version 0.8.10 build 1. Both uploads succeeded and both builds show **Ready to Test**. Export-compliance questionnaires are complete. The YATA Internal group contains both builds and one account-holder tester with status **Invited**. Automatic distribution is disabled; future builds must be added explicitly. Both platform builds were subsequently submitted for external beta review and verified Waiting for Review in YATA Public Beta. The public invitation link is https://testflight.apple.com/join/f7ZWnFZx (open to anyone, no custom tester limit). Apple states testers cannot join until the group has an approved build. No public App Store release was submitted.

Evidence: [TestFlight group](https://appstoreconnect.apple.com/apps/6836149390/testflight/groups/21781e18-a544-4c6c-a6a9-653e4acdb2a3/builds). Both projects use bundle identifier `com.doctorew.yata`; the archive helper takes the marketing version from `mobile/package.json` and requires an explicit build number. Build numbers must be checked against App Store Connect before uploading.

## Targets

- iOS: `ios/App/App.xcodeproj`, scheme `App`. Reuses the existing Capacitor interface. The `yata` custom URL scheme connects to the existing shared-link handler. Android background audio remains Android-only.
- tvOS: `tvos/YATA.xcodeproj`, scheme `YATA`. Native SwiftUI library, show search, episode selection and AVKit playback of checked HTTPS Archive sources. Unavailable or unsupported providers remain visible and cannot launch. YouTube playback, scheduled channels, saved queues, buddy chat and Arcade are not implemented. This is a first native foundation, not feature parity with iOS.

`tvos/prepare.mjs` copies the mobile build's published catalog only after checking its content hash. The app verifies the bundled snapshot and remote updates independently. It does not publish catalogs or bundle video. Licenses and attribution are bundled and accessible from About. Apple icons reuse the Android launcher vector at `android/app/src/main/res/drawable/yata_icon.xml`. Regenerate them with `node mobile/apple-icons.mjs` from the repository root (requires librsvg and ImageMagick). The vector is rasterized without changing its paths or colors; tvOS uses a centered foreground and matching full-width background.

## Archive and upload

Install mobile dependencies with `npm ci` from `mobile`. The executable helper is `mobile/apple-release.mjs`. Supply `--platform ios` or `--platform tvos`, an unused `--build NUMBER`, and `--team TEAMID`. The helper builds assets, syncs the selected platform, and archives with automatic provisioning. For a tvOS upload it defers signing until distribution export, avoiding the need to register a development Apple TV. Add `--upload` to export to App Store Connect. Use `--unsigned` instead of a team only for compile validation; this mode does not upload or sign. The tvOS upload flow signs its intermediate unsigned archive during export.

An authenticated Apple Developer Program team, signing certificates/profiles and an App Store Connect app record with both platforms are required. The account holder signed in and accepted the updated Apple agreement. Automatic distribution signing and uploads succeeded for both platforms. No passwords or signing credentials are stored in this repository.

After upload, check Apple's processing result, export-compliance questions, required beta metadata and tester group. External testers may require beta review. Internal testing was authorized and configured. The tvOS feature limitations above remain.

Apple references: [upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds), [add platforms](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-platforms), [TestFlight](https://developer.apple.com/testflight/). Capacitor's supported targets are documented in [environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).

## Verification

- Xcode 27.2 / build 27B52 was available locally.
- iOS simulator Debug build passed. Installed and launched in an owned iPhone 17 Pro simulator running iOS 26.0; initial screen and loaded episode metadata were visually inspected. Evidence: `/private/tmp/yata-ios-build.log` and `/private/tmp/yata-ios-first-launch.png`.
- tvOS device Debug build and unsigned Release archive passed. Evidence: `/private/tmp/yata-tvos-build.log` and `/private/tmp/yata-tvos-archive.log`.
- tvOS simulator Debug build passed. Installed and launched in an owned Apple TV 4K simulator running tvOS 27.2. Library and successful public catalog refresh were visually inspected. Evidence: `/private/tmp/yata-tvos-simulator.log` and `/private/tmp/yata-tvos-first-launch.png`.
- iOS unsigned Release archive passed. Evidence: `/private/tmp/yata-ios-archive.log`. These initial unsigned archives were compile-validation artifacts; subsequent distribution exports and uploads succeeded.
- Catalog Swift tests passed: current snapshot decoding, modified-byte rejection, foreign manifest path rejection, provider and playback URL allowlists. Test source: `tvos/Tests/CatalogTests.swift`.
- Existing JavaScript suite passed all 275 tests. Evidence: `/private/tmp/yata-apple-tests.log`.
- iOS signed archive and both distribution exports/uploads passed. Evidence: `/private/tmp/yata-ios-team-signing.log`, `/private/tmp/yata-ios-upload.log`, `/private/tmp/yata-tvos-upload.log`.
- App Store Connect processing completed; both builds were verified Ready to Test in the internal group.
- Physical iPhone/Apple TV playback, remote interaction, iOS companion verification and TestFlight installation remain unverified.

TestFlight availability is verified; public App Store approval and device installation are not. Temporary logs and archives are outside version control.
