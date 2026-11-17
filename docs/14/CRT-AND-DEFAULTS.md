# Commercial defaults and optional CRT effects

## Scope

Implements [issue 14](https://github.com/doctor-ew/floating-browser/issues/14). New catalogs enable vintage commercial breaks. Existing saved On/Off choices remain intact, including catalogs that already contain false from the earlier default; no attempt is made to infer whether that historical value was an explicit choice. Viewers can change it in Stream settings.

Add independent **CRT surround & scanlines** and **Tuning static** checkboxes. Both presentation effects start off until selected. CRT adds an independently drawn decorative surround, vignette and subtle scanlines. Tuning static is a single 180 ms low-contrast fade on channel/source changes, without sound. Toggling presentation never restarts or reparents the player. Window-filling mode remains available.

## Persistence and lifecycle

Presentation is stored separately from the catalog at `yata.retro-effects.v1` as boolean `crt` and `static` properties. Missing, malformed or unavailable storage falls back to usable controls. Repeated pulses cancel the earlier timer/animation. Disposal removes overlays and listeners. Reduced-motion and forced-color preferences suppress tuning static; forced-color mode also suppresses CRT decoration. Decorative overlays are aria-hidden and do not intercept pointer events.

Default catalog settings are now `bumpers: true`. Saved explicit false remains false on reload and additive catalog import. The manifest continues to separate program-ready entries from optional break clips; station slot count now reflects the default-enabled breaks.

## Validation

All 59 tests pass, including saved-Off preservation, new-catalog default On, appearance persistence, static timing, accessibility preference suppression, cleanup and existing window-mode compatibility. Syntax checks and static build pass. Interactive visual/browser playback verification remains pending because the browser preview host is unavailable.

## Attribution

This CSS and scheduling implementation is independently written. Credits for the retro-TV inspiration remain linked on-screen and in ATTRIBUTION.md: Joey Cato / MyRetroTVs and Nikolay1243 / retro-tv-webos. No upstream television artwork is included.

## Follow-up

Issue 15 supersedes the earlier default-only behavior with a one-time startup migration that enables commercials for older saved Off defaults. Subsequent explicit choices remain preserved. It also adds full television cabinet designs and configurable static controls.
