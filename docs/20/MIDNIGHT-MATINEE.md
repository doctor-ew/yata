# Sci-Fi expansion and Midnight Matinee

## Scope

Sci-Fi now includes six additional series and a separate feature-film collection. Four channel buttons remain: YATA, Action Adventure, Sci-Fi, and Saturday Morning. Midnight Matinee appears as a dedicated section in the Sci-Fi and mixed libraries, with Browse films & wishlist and Random movie stream actions.

`MOVIE_SHOW_ID` in `nostalgia-tv/src/collections.mjs` defines the reserved collection identifier `midnight-matinee`. It uses existing catalog episode records to represent individual films; no new episode kind or catalog version is required. Each film retains its provider source and can be shared, resumed, skipped, or opened at its original source.

## Rotation rules

Ordinary mixed and Sci-Fi station schedules exclude the movie collection. TV tuning dials also exclude it; using a dial returns to TV programming. Explicitly selecting Midnight Matinee, its random-stream button, or a film source starts movie playback. The stream selector labels the collection as movies only. The existing New mix action reshuffles an explicitly selected movie stream. Optional commercials play between films using the existing break-count preference. Films are not interrupted by application-inserted commercials.

The collection contains five feature-length Internet Archive sources with known runtimes and successful per-file HTTP checks: Plan 9 from Outer Space, The Phantom Planet, Teenagers from Outer Space, The Last Man on Earth, and The Atomic Brain. Five requested classics remain explicit wishlist entries without sources: The Day the Earth Stood Still, Forbidden Planet, This Island Earth, The War of the Worlds, and Them!. Wishlist entries cannot enter a stream until a supported source and runtime are attached and checked.

## Series coverage

| Series | Seeded entries | Coverage note |
| --- | ---: | --- |
| Space: 1999 | 48 | Filename-based seasons and episode numbers |
| UFO | 26 | Filename-based seasons and episode numbers |
| The Fantastic Journey | 10 | Filename ordinals; season zero where not explicit |
| Logan’s Run (TV series) | 14 | Filename ordinals; season zero where not explicit |
| Space Academy | 4 | Only entries 1, 2, 3, and 8 found in this bounded search |
| Jason of Star Command | 28 | Sixteen shorter first-season chapters and twelve longer second-season episodes; no invented splits |

The 130 series entries have runtime metadata and successful per-file HTTP checks. Provider metadata identifies English for all series except Space Academy, whose language is unspecified. Decoding and spoken-language checks were not performed. These counts are catalog entries, not a guarantee of complete worldwide availability.

## Provenance and availability

`nostalgia-tv/data/scifi-discovery.json` records collection metadata, filenames, search bounds, gaps, and endpoint checks. `nostalgia-tv/data/movies-discovery.json` records movie item URLs, runtime provenance, endpoint checks, and any uploader-supplied license metadata. Archive uploader metadata is not an independent rights determination. No media files are copied to the application host. Sources can change or become unavailable.

Requested classics without a checked source remain wishlist entries rather than assumed playable copies. New series and movie records are added through the existing versioned library update. Existing shows, source IDs, user additions, stream preferences, and commercial choices are preserved. Repeated updates deduplicate provider URLs. Oversized or damaged catalogs are not overwritten by a failed update.

## Validation

The automated suite covers ordinary-TV exclusion, explicit movie streams and breaks, manual film queues, TV dial scope, wishlist exclusion, and non-destructive library upgrades. Isolated browser checks cover source and preference preservation, automatic series installation, the movie section and wishlist, random movie playback and Next, source-based film sharing, and viewport-filling playback across all four cabinet themes at desktop and mobile sizes. Browser playback uses a local synthetic video fixture; it does not establish decoding of every remote source.
