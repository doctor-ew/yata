# TV Guide

## Purpose

Expose the existing YATA station schedules as a six-channel, local-time program grid alongside Library. The guide is a personal simulated station schedule, not a provider broadcast listing.

## Behavior

- The large channel cards are replaced by a compact, tactile 70s/80s-style remote beneath the TV. Its SET UP button opens stream and TV configuration in a native modal overlay; a compact status displays rotation and commercial state. Escape, Close and Done dismiss the overlay without replacing playback. Legacy browser backup export remains in a collapsed footer detail, outside the main layout.
- On desktop, Guide mode places the same player in a sticky left column beside the schedule using CSS layout without reparenting it. Fill window expands and restores it; narrow screens stack player and guide. Direct guide links land at the guide on desktop and at the player on narrow screens.
- Guide and Library are tab panels. Header links and direct `#guide` navigation open the corresponding panel. Browsing does not replace or dispose the existing player.
- The grid shows two hours at proportional widths, anchored to a half-hour boundary. Earlier and Later navigate two-hour windows, up to one day in either direction; Now returns to the current window.
- Each row uses the current rotation, shuffle seed, story-turn length, commercial settings, and epoch with its single-show filter cleared. Full-channel mixes remain distinct from an active single-show stream.
- Program selection displays the full show title, episode title, original time range, and provider. Consecutive commercials form one break block, including a break that begins before the visible window.
- Join channel live preserves the epoch and joins the channel's current schedule position. Start episode from beginning starts the selected occurrence at zero and retains station queue navigation.
- Only checked, schedulable sources appear. Midnight Matinee remains excluded from ordinary channel mixes. Wishlist, unchecked and external-only sources remain available through Library.

## Data and performance

`src/tv-guide.mjs` compiles channel schedules and projects bounded windows. Compilations are cached by catalog identity in `src/tv-guide-ui.mjs`; ordinary clock updates reuse the rows and DOM. At most 512 underlying schedule entries are traversed per row/window; truncation is explicit for pathological short-item catalogs. Guide data is derived in memory and introduces no catalog writes, database, credentials, or public editing API.

## Appearance

Walnut surfaces and warm ivory program listings establish the page palette. Burnt-orange actions and muted olive controls complement the retro cabinet. Amber is reserved for remote numerals and hardware selection indicators. Color changes do not alter scheduling, data storage, user preferences or player behavior.

## Accessibility

Native buttons expose full program labels and selected state. Guide and Library tabs support arrow keys, Home and End. The mobile grid scrolls inside its labeled region, with sticky channel labels. Program details and actions reflow; the page itself does not overflow horizontally.

## Verification

Schedule tests cover cycle boundaries, negative epoch offsets, current playback equivalence, commercial grouping and anchors, stale source removal, full-channel scope, film exclusion, and bounded short-item windows. The browser regression uses provider stand-ins to verify UI and transport wiring; it does not establish provider decoding or availability. Existing owner-storage and shared-publication browser regressions remain required.
