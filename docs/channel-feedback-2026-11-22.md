# Channel and feedback fixes

Status: prepared in source on November 22, 2026. No web deployment, app installation or public release was performed for these changes.

## Request review

[Issue 55](https://github.com/doctor-ew/yata/issues/55).

Companion channel plans and the standalone builder show an application-generated review before saving. Comma-, semicolon- and newline-separated requests are compared with checked catalog titles. The review distinguishes unmatched requests, available requested titles omitted by the plan, and suggested alternatives. It states the actual proposed lineup. Unmatched requests are scoped to the current checked catalog, not worldwide availability. General mood requests are presented as suggestions without asserting unavailable show identities.

The companion provides Save & play this lineup and Keep my current channel. Saving revalidates the finite plan against the current catalog. The standalone builder also requires its explicit save action, including requests opened through automatic-build events. The generated introduction is replaced by the factual review in these flows. Explicit local watch commands for fully matched titles retain their existing behavior.

## Saved personal lineups

[Issue 56](https://github.com/doctor-ew/yata/issues/56).

Creating a new personal lineup retains the previous Channel 00 lineup. Up to 50 named lineups are kept in personal preferences, with show IDs, rotation seed, epoch and rotation mode. A selector below Make a channel offers Play selected lineup and Remove selected lineup. Channel 00 plays the selected lineup; these are saved personal presets, not 50 new public channel numbers. The episode queue remains separate.

The previous single lineup is retained as a legacy entry when the saved-lineup workflow is used. Reload and public catalog refresh preserve saved lineups. Refresh removes missing shows from each saved lineup and drops empty lineups. Invalid or excessive saved data is rejected. Storage remains local to the browser/app and is not synchronized between devices. The UI states the 50-lineup limit.

## Feedback form

[Issue 57](https://github.com/doctor-ew/yata/issues/57).

Requests & bugs opens the existing form as a named modal dialog above the companion. The summary field receives focus. Summary, details and category controls fit the phone viewport, and Close is a touch-sized button. Review on GitHub opens a public draft; no issue is posted automatically and conversation history is not included.

## Validation

- 313 Node unit tests passed; syntax checks passed.
- Separate Chrome companion regression passed the screenshot title-list explanation, no save before acceptance, cancellation, accepted saves, invalid-plan rejection, feedback modality, summary focus, close/reopen and a 390-by-844 viewport with bounded fields.
- Separate Chrome full-app regression passed two saved lineups, selecting an earlier lineup, reload persistence, removal of the unselected lineup, checked-ID rejection and standalone review.
- Android debug package built successfully with 351 collections from published revision `e6fcea9b8cae48d80eb226b34651cd79a0b4f96ccc15cbf73a659f77bf978023`.

Browser AI and media responses were test stand-ins. These checks establish client behavior, not paid-model response quality or physical Android/iOS behavior. The APK was not installed for this task. App version remains 0.8.22; published release-note facts remain unchanged.

## Mac Apple TV request

The Mac has the Apple TV application but the selected developer directory is CommandLineTools, and `xcrun simctl` is unavailable. No YATA Apple installation was performed. Running the tvOS client locally requires Xcode and a tvOS simulator; it cannot be installed inside the Mac Apple TV application.
