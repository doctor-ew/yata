# YATA repository instructions

Verify existing file paths, identifiers and configuration against direct sources. Write technical documentation in AD style. Do not invent facts or report unrun checks as passed.

This standalone repository contains YATA web, mobile and arcade source. Preserve LICENSE, ATTRIBUTION.md and third-party license notices. Do not commit privately supplied games, emulator binaries, signing keys, credentials, build caches or APKs; distribute APKs through GitHub Releases.

Keep the published shared catalog authoritative. Never replace its manifest or immutable snapshot with a generated seed. Catalog publication requires explicit authorization. Preserve attribution links on both web and mobile.

Use isolated ticket branches. Publish to doctor-ew/yata when authorized; do not send YATA work upstream to the original browser repository. Do not automate the installed Floating Browser native app. Test with a separate browser, owned emulator or user-authorized ADB device.

Validate changes with relevant tests and builds. Web deploys and mobile installs require task authorization. Historical reports under docs preserve prior observations and issue links; they are not fresh test results.

Keep CHANGELOG.md current for each user-visible release. Back shipped changes with repository commits or GitHub release notes; do not describe roadmap work as shipped. Keep src/release-notes.mjs aligned with the latest published version so buddy “what’s new” replies use verified facts. Preserve changelog links on web and in the native About menu.

When Arcade source catalogs change, regenerate src/arcade-games.mjs with scripts/build-game-index.mjs. Keep game-name resolution finite and metadata-only; model output must never become a launch URL. Preserve the launcher-only AI/Turnstile policy and the embedded game pages’ network restrictions.

After user-visible changes, publish a concise sourced update to the remote YATA Pensieve pool and confirm the remote receipt. The user explicitly prefers remote updates every time. Local captures or held/pending outbox entries are not a completed remote update. If personal authentication fails, report the blocker and retain the local handoff for retry; never put credentials in repository files or memories.
