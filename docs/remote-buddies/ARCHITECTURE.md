# Remote companion roster

## Data and authority

The authoritative public presentation roster is data/buddy-personas.json. It contains finite character identities, display names, aliases, portraits, credits, greetings, hover lines, channel preferences and Arcade eligibility. Web, native apps, channel hosts and the verified-origin chat bridge consume it. The initial feed contains 48 characters, six Arcade-eligible.

Character voices remain in the backend's approved personality configuration. The feed contains no private prompts, credentials or permissions. Adding a character requires approving its server-side identity and voice, then publishing its public profile and artwork. Clients from 0.8.12 can receive that character without an APK update. New tools, UI capabilities or native integrations still require application code. Older clients retain their bundled roster until upgraded.

## Validation and lifecycle

The strict version-1 schema permits at most 200 profiles and 250 KB. ID and personality must match. Duplicate identities, ambiguous aliases, unknown fields, oversized strings, unsafe portrait paths and credential-bearing credit URLs are rejected. Portraits resolve only below the existing public buddy-assets directory. Display strings are rendered as text. No profile can supply media launch URLs or grant model tools.

Valid cached data loads before pinned preferences are resolved. A syntactically valid pinned identity is retained even when its cached profile is unavailable; a temporary bundled companion appears until its approved network profile returns. Refresh preserves visibility, random mode and existing pins. Same-host metadata changes preserve active chat and channel generation. Removing a selected profile leaves a usable fallback. Packaged portraits provide fallback for bundled characters if remote images fail; newly downloaded characters may have only their name when offline artwork is unavailable.

The network feed is read on app launch or page load. Invalid/unavailable data uses the last valid cache, then the bundled roster. No background polling is provided. TV and Arcade keep separate preferences. The native JSON reader admits only the exact public buddy-feed path alongside its existing bounded catalog paths. The chat iframe refreshes its own roster and returns an immediate nonce-bound error if its approved presentation list differs from the native caller, rather than waiting for the full request timeout.

## Publication

Edit the JSON profile data and add credited portrait files. scripts/build-buddy-feed.mjs validates/canonicalizes the existing JSON. Its explicit bootstrap option creates a missing file from bundled profiles and never overwrites an existing authoritative roster with a seed.

The shell publisher validates the exact release feed through the shared JavaScript schema, confirms each portrait is present in the release, then checks each ID against the actual guarded backend using an invalid-session canary. Accepted identities must reach the session denial (401); unknown identities (400) or service failures stop publication before uploads. These canaries do not run moderation, models or quota-consuming authorized work. Portraits finish uploading before the feed can advertise them. Conditional object writes, release hashes and private rollback versions remain in use. No new AWS resource or public execution endpoint is added.

Analytics retains the collector's finite approved dimensions. Approved roster identities unknown to that collector map to none, preserving aggregate counts instead of rejecting an entire batch. Per-character breakdown for those identities requires collector approval; a parity test checks the client allowlist against the collector source.
