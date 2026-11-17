# YATA roadmap

GitHub issues are the source of truth for planned work. These items are proposals, not shipped capabilities.

| Proposal | Tracking issue | Scope |
| --- | --- | --- |
| Personal Plex library | [#1](https://github.com/doctor-ew/yata/issues/1) | Explicit authorization, private credentials, personal server permissions |
| Shared channel lineups | [#2](https://github.com/doctor-ew/yata/issues/2) | Extend existing lineup links with preview, portability, and missing-content handling |
| Watch together | [#3](https://github.com/doctor-ew/yata/issues/3) | Invited rooms, synchronized playback, drift correction, provider limitations |
| Chat with friends | [#4](https://github.com/doctor-ew/yata/issues/4) | Invitations, mute/block/report controls, retention and moderation decisions |
| Anonymous usage analytics | [#5](https://github.com/doctor-ew/yata/issues/5) | Channel popularity, approximate watch time, playback failures, AI outcomes, platform distribution |

## Feedback intake

The TV buddy gathers a request in conversation, shows a draft, and opens a prefilled GitHub issue for the viewer to review and submit. A conventional form is available on request or when conversation becomes frustrating. Opening a draft does not publish it. GitHub login is required for submission. Issues are public; the interface asks viewers to omit contact details, private URLs, credentials, and chat transcripts. The app does not collect a reply email or send feedback through SES.

Bug reports and content/channel suggestions use repository issue forms. Maintainers triage public submissions; no user request automatically changes the shared catalog or roadmap priority.

## Analytics boundary

The proposed analytics work is tracked separately. This release does not add usage tracking or store buddy transcripts. Aggregate metric definitions, retention, viewer controls, and optional diagnostics must be documented before collection is enabled. Watch duration requires an explicit definition for paused, hidden, background-audio, failed, and disconnected playback; heartbeat counts alone are not exact viewing time.
