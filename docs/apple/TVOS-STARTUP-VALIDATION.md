# tvOS startup playback validation

Date: 2026-11-20. Branch: `fix/tvos-autoplay-channel`.

## Result

Apple TV now opens Watch and autoplays a verified Archive episode. It restores a playable saved channel and falls back to channel 01. Library and About remain available. The player advances at end of media; channel changes and Next program are available.

Source: `mobile/tvos/YATA/YATAApp.swift`, `mobile/tvos/YATA/Catalog.swift`.

## Checks executed

- Xcode Debug simulator build succeeded with code signing disabled. Build log: `/private/tmp/yata-tvos-autoplay-build.log`.
- Swift executable tests passed for saved-channel restoration, unknown/empty channel fallback, one-show-per-turn rotation, unavailable sources, bumper exclusion and empty catalogs. Existing catalog hash, manifest and URL boundary checks also passed.
- Installed on Apple TV 4K (4th generation), tvOS 27.2, simulator 9E1D23B2-DF80-446D-B9BD-92BE1F7F58F7.
- Computer Use observed launch into Watch/channel 01 and changing video frames from The Dukes of Hazzard, High Octane, without selecting an episode or pressing Play.

## Limits

This native channel rotation is not the shared web wall-clock schedule. It starts the first program on a channel when tuned, then advances through the rotation. Channel 00 queues, program-position restoration, shared random rotation/commercial breaks and Guide are not implemented here. Last-channel selection was tested at the model level; relaunch after switching channels and end-of-media advancement were not exercised in the UI. No App Store or TestFlight deployment was performed.

## Pending remote Pensieve handoff

Remote update is blocked. The MCP list_pools call returned "Operation unavailable; check connection, membership and capture policy". The personal CLI `pensieve team-pools` returned HTTP 401. No remote receipt was obtained.

Retry summary: tvOS startup now opens Watch and autoplays the last playable channel, falling back to 01. The simulator visibly played High Octane automatically. Build and catalog/channel tests passed. Native round-robin playback is implemented; Channel 00 and shared station-clock scheduling remain pending. Source citations: this report and the two Swift files above. Repository: https://github.com/doctor-ew/yata.
