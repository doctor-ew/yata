# YATA iOS TestFlight preparation

## Current status

The Capacitor iOS project and bundled web assets are prepared. Native compilation, signing, archive export and upload have not completed. The inspected Mac has Command Line Tools, but no full Xcode installation or valid code-signing identity. Apple developer membership/team selection is pending user input. Do not describe this state as a TestFlight release.

The project uses bundle identifier `com.doctorew.yata`, version `0.8.0`, automatic signing, and an initial iOS build number of `1`. Choose a new build number after checking existing App Store Connect uploads. `yata://` return links are registered for the buddy and shared-lineup handoffs. The app privacy manifest declares product interaction for analytics and optional user content for app functionality, without tracking or linkage to an app user identity.

## Local setup

Install Xcode from Apple’s App Store and complete its first-launch setup. Capacitor 8 requires Xcode 26 or newer. Sign into the intended Apple Developer account in Xcode and identify the verified development team. TestFlight upload requires App Store Connect access; external testers may require Apple’s beta review. Never put Apple passwords, signing keys or API private keys in this repository or chat.

From the `mobile` directory:

```sh
npm run ios:check
npm run ios:simulator
```

The check verifies full Xcode and the App scheme. The simulator command prepares current web assets, syncs iOS packages and builds an unsigned simulator application. It does not create an installable TestFlight build.

Set `YATA_APPLE_TEAM_ID` locally to the verified team ID, then choose the build number after checking App Store Connect:

```sh
npm run ios:archive -- --build 1
npm run ios:testflight -- --build 1
```

These two commands are alternatives: the first archives and exports locally; the second archives and uploads. They do not automatically invite testers. The helper reads the app version from `package.json`, verifies the installed Xcode export identifiers before writing configuration, and retains artifacts under the ignored `mobile/artifacts/ios` directory. Upload completion is not equivalent to Apple processing or review completion.

## App Store Connect preparation

Use the selected developer team’s app record for `com.doctorew.yata`, or create that record if it does not exist and the account has permission. Confirm the name is available before saving it. Supply actual account contact details and complete Apple’s export-compliance questions based on the app; no compliance answer is preselected in the project.

Review `testflight/WHAT-TO-TEST.txt` and `testflight/REVIEW-NOTES.md` before copying them to the build’s TestFlight metadata. The privacy description in `docs/PRIVACY.md` covers both anonymous analytics and optional buddy requests; analytics alone is not a complete description of all off-device processing.

## iOS verification still required

- Native simulator compilation and launch.
- A signed archive accepted by App Store Connect.
- Catalog refresh, official video players, captions, sharing, custom URL returns, and app-state transitions on iOS.
- Pause/resume on a physical iPhone, including the viewer’s original report.
- iPhone/iPad layouts and the guide’s queue action menu.

The existing automated WebKit checks cover the browser engine and selected lifecycle behavior, not a native iOS binary. Native screen-off audio currently exists on Android; the iOS wrapper pauses on backgrounding. No unsupported iOS background capability is declared.

## Primary references

- https://capacitorjs.com/docs/getting-started/environment-setup
- https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds
- https://developer.apple.com/testflight/
- https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests
