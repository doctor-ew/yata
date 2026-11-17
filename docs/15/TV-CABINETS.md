# TV cabinets, adjustable static and commercial blocks

## Scope

Implements [issue 15](https://github.com/doctor-ew/floating-browser/issues/15). Surround the existing player with independently drawn 1970s woodgrain, 1980s color-TV or 1990s charcoal cabinets, with None for a clean player. Default new cabinet selection is 80s. Decorative controls are aria-hidden. Switching themes preserves the provider video/iframe node; Fill window and mobile layouts remain available.

Static controls include an enable checkbox, tuning-only or continuous grain mode, strength 0–30%, tuning length 80–800 ms, and preview. Static remains silent; reduced-motion and forced-color preferences suppress it. Saved legacy appearance booleans are retained while new fields receive validated defaults.

## Commercial preference correction

The previous release changed only new-catalog defaults. Existing browser catalogs retained false, which caused the reported Off toggle. Startup now performs a one-time migration tracked by `yata.commercial-default.v2`: enable commercials and save the catalog before recording completion. Subsequent explicit choices record completion and remain preserved. Corrupt saved catalogs are not overwritten. Failed catalog saves do not record completion; failed marker writes attempt rollback. If browser storage selectively rejects the marker while accepting catalog writes and rollback also fails, durable preference preservation cannot be guaranteed; the helper reports marker failure.

Break length is the catalog setting `commercialCount`, accepted values 1, 2, 3, or `random`. New catalogs default to random; legacy catalogs without this field normalize to 1. Random selection is seeded and repeatable, ranges from 1–3 and caps to the number of distinct available clips. Whole story groups stay intact. Both ordered and random stations and manual show queues support multi-clip breaks. Playback positions retain surrounding program anchors so disabling/removing a clip does not strand navigation within an old break.

## Validation

The combined release passes 83 unit/integration tests and syntax checks. An isolated headless Chrome profile verified all four themes, mobile bounds, window-fill behavior, unchanged player node identity, persisted static controls, reduced-motion suppression, commercial-count changes, old Off-to-On migration and subsequent saved Off persistence. Cabinet screenshots were visually inspected. These browser checks use the local preview and do not operate the installed Floating Browser app or the user’s browser profile. Complete third-party video decoding was not rechecked for every catalog source.

Original CSS artwork is independently written; existing MyRetroTVs / Joey Cato and retro-tv-webos / Nikolay1243 inspiration credits remain in ATTRIBUTION.md and the footer.
