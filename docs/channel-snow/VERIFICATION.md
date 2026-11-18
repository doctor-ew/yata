# Channel tuning feedback

Release: 0.8.13, 2026-11-18.

Channel buttons and switches between shows trigger a short animated grey snow field. The default tuning duration is 240 ms; saved durations remain respected. Playback starts normally underneath the decorative layer. Timers and animations are replaced on subsequent changes and restored correctly for continuous grain. Static-off, zero strength, reduced motion and forced colors suppress the transition.

Optional procedural hiss/click reuses the channel/dial sound setting. It follows player volume/mute and does not restart the visual animation. No audio or imagery was copied from Robot Chicken or MyRetroTVs. Existing MyRetroTVs inspiration attribution remains in the project.

Validation: 290 Node tests passed and syntax checks passed. A Chrome browser check observed the snow layer appear with the noise background, then clear; static-off and reduced motion suppressed it. Android build succeeded. APK metadata reports version 0.8.13, code 24. ADB had no connected device, so physical installation and testing were not performed. iOS/tvOS builds remain unverified.

APK SHA-256: a48f1bea889cee7cbb273e64da924eacdf2e62a9a9d4835a1d7aab7a619aea53.
