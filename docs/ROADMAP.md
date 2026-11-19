# YATA roadmap

GitHub issues are the source of truth for planned work. Status is shown per item; open proposals are not shipped capabilities.

| Proposal | Tracking issue | Scope |
| --- | --- | --- |
| Incremental TypeScript and shared contracts — planned epic | [#35](https://github.com/doctor-ew/yata/issues/35) | ADR, typed API/action contracts, native/service adapters, feed boundaries, pure domain migration and CI; six linked sub-issues |
| Arcade companions and game routing — shipped in 0.8.4 | [#10](https://github.com/doctor-ew/yata/issues/10) | TV/game disambiguation, exact launch after Konami unlock, independent game-focused buddy pins; [behavior and verification](ARCADE-BUDDIES.md) |
| Personal Plex library | [#1](https://github.com/doctor-ew/yata/issues/1) | Explicit authorization, private credentials, personal server permissions |
| Shared channel lineups | [#2](https://github.com/doctor-ew/yata/issues/2) | Extend existing lineup links with preview, portability, and missing-content handling |
| Watch together | [#3](https://github.com/doctor-ew/yata/issues/3) | Invited rooms, synchronized playback, drift correction, provider limitations |
| Chat with friends | [#4](https://github.com/doctor-ew/yata/issues/4) | Invitations, mute/block/report controls, retention and moderation decisions |
| Anonymous usage analytics — shipped in 0.7.1 | [#5](https://github.com/doctor-ew/yata/issues/5) | Channel plays, approximate foreground playback time, failures, AI outcomes, platform distribution; [definitions and access](ANALYTICS.md) |

## Feedback intake

The TV buddy gathers a request in conversation, shows a draft, and opens a prefilled GitHub issue for the viewer to review and submit. A conventional form is available on request or when conversation becomes frustrating. Opening a draft does not publish it. GitHub login is required for submission. Issues are public; the interface asks viewers to omit contact details, private URLs, credentials, and chat transcripts. The app does not collect a reply email or send feedback through SES.

Bug reports and content/channel suggestions use repository issue forms. Maintainers triage public submissions; no user request automatically changes the shared catalog or roadmap priority.

## Analytics boundary

Anonymous aggregate usage is implemented in 0.7.1. See [ANALYTICS.md](ANALYTICS.md) for definitions, retention, viewer controls and dashboard access. Chat transcripts, contact email and private URLs are excluded. Opt-in diagnostics and native background-audio timing remain separate work.

## Shipped follow-ups

- [Saved Channel 00 episode queue, #6](https://github.com/doctor-ew/yata/issues/6): shipped in 0.8.0, including reorder/remove, saved position and guide actions.
- [Pause/resume follow-up, #7](https://github.com/doctor-ew/yata/issues/7): identified metadata and page-cache reset paths corrected in 0.8.0; automated WebKit checks pass. The original viewer’s physical iPhone retest remains open.
