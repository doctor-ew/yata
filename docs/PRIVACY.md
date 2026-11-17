# YATA privacy and data use

YATA is maintained by Drew Schillinger. Questions can be sent to drew@doctorew.com. This document describes the current application behavior; independent media, AI, browser-verification and GitHub services have their own privacy practices.

## On-device preferences

Room appearance, buddy choice, channel settings, episode queues and playback bookmarks are stored locally in the browser or app. They are not automatically synchronized between devices. Clearing browser or app storage removes these local preferences. Shared-lineup links contain the selections the viewer explicitly chooses to share; they do not include authentication credentials.

## Anonymous usage counts

With collection enabled, YATA sends predefined events describing app launches, channel plays, approximate foreground playback time, playback failures, AI outcomes, feedback-draft openings and arcade unlocks. Fields are limited to channel category, media provider, buddy host, platform, app version and bounded numeric values. The usage dataset excludes chat text, contact email, private media URLs, referrers and persistent viewer identifiers.

Usage collection can be disabled in television setup on web or More → Privacy in the native app. Disabling it clears pending events. Global Privacy Control and Do Not Track signals disable collection. Event logs have a 30-day retention setting. Random batch receipts and short-lived keyed network-address hashes are used for duplicate rejection and abuse throttling, not viewer profiles. Infrastructure services necessarily process network requests and may have separate operational/security logs. See `ANALYTICS.md` for measurement, retention and rate-limit details.

## Optional AI buddy and channel requests

Submitting an AI request sends the question, selected character style and relevant catalog context to YATA’s backend and its AI provider so they can generate a reply. These requests are separate from anonymous usage analytics. Conversation text remains in the current app/browser session rather than a saved local transcript. Provider-side processing and retention are governed by the relevant service’s policies and account configuration; this document does not claim that external providers retain no request data.

Cloudflare Turnstile verifies browser requests before the AI flow. Native requests continue through that verified web flow. No AI API secret is embedded in the app. No app user account is required for this functionality.

## Media playback and external websites

Playback and captions contact their source providers, including Internet Archive and YouTube. Those providers may process network/device information, use cookies or display advertisements under their own policies. External pages open through the platform’s browser facilities. The application’s anonymous usage controls do not disable independent provider processing.

## Feedback and sharing

The buddy can help draft feedback, but a request is not posted automatically. Reviewing a draft opens GitHub; submitting it creates a public issue under the viewer’s GitHub account. Do not include private contact details, credentials or private media links. Shared episode/lineup links are sent only through the sharing action the viewer chooses. GitHub and sharing destinations operate under their own privacy policies.

## Scope

YATA does not implement advertising identifiers, cross-app tracking, payments, contact-list access or a background location service. Native screen-off audio on Android is distinct from foreground usage measurement. The iOS TestFlight build is still being prepared and must be validated before any release claim is made.
