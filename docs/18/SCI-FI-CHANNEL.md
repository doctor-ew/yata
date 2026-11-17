# Sci-Fi channel

## Behavior

The channel selector contains four buttons in this order: YATA, Action Adventure, Sci-Fi, Saturday Morning. Sci-Fi is channel 03. Saturday Morning becomes channel 04. Desktop uses four columns; narrow screens use two rows of two buttons.

Sci-Fi reuses the existing curated sources for nine live-action shows. It contains 156 station-eligible entries: Automan (13), The Phoenix (5), Voyagers! (20), Buck Rogers in the 25th Century (33), Battlestar Galactica (21), V (18), The Powers of Matthew Star (22), Misfits of Science (16), and Otherworld (8). Source checks and known runtimes establish scheduling eligibility, not a guarantee of future playback. No new source or availability claims were added.

The mixed YATA stream includes all categories. Science-fiction cartoons remain on Saturday Morning. Known action heroes remain on Action Adventure. Sci-Fi supports ordered and random playback, show-only streams, channel dials, episode sharing, and the existing optional commercial pool.

## Catalog compatibility

The catalog version remains 1. `channels.mjs` defines the available channels and the curated migration set. Catalog validation reclassifies only the listed show identifiers when their previous category is action. Custom shows and explicit cartoon categories are preserved.

A legacy show-only action stream follows a migrated show to Sci-Fi; other stream preferences remain unchanged. Catalog reads save category changes when storage permits. A failed write leaves the migrated catalog usable in memory. Invalid catalogs are not overwritten. Imports receive the same normalization before saving. Migration is idempotent and retains source identifiers, URLs, episodes, ordering, and user-added content.

The existing action discovery pack remains the source of both action and Sci-Fi entries. Its refresh script and build coverage checks include both categories. The library revision incorporates show classifications so previously installed libraries receive the new grouping.

## Validation

All 100 automated tests pass. New coverage includes channel order, seed classifications, legacy migration and source preservation, selected-stream migration, blocked storage, invalid catalogs, station eligibility, dial scope, and optional commercials. Isolated browser checks confirmed four ordered buttons, saved Buck Rogers stream migration, retained commercial preferences and source count, Sci-Fi-only stream options, next-show tuning to Battlestar Galactica, and the mobile two-column layout without horizontal overflow. The existing 2,816-item catalog count is unchanged.
