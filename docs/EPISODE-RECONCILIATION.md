# Episode evidence reconciliation

## Status and scope

Assessment date: 2026-11-17. The authoritative published catalog revision is `70d1828cbac3a4eca469e2288493bf5b6658729561d471a66a32f4a4f06da96d`, containing 255 shows and 11,939 catalog items. Sources are the [published manifest](https://doctorew.com/tv/data/published-catalog-manifest.json), its SHA-256-validated snapshot, and TVmaze episode responses cached for this pilot on the assessment date.

The assessed examples do not establish numeric errors in the catalog. They demonstrate alternate multipart counting, title-format differences, a spelling alias, and a mismatch between an individual part and a whole-story synopsis. Preserve catalog numbering unless separate evidence establishes a catalog defect.

The initial runtime-guarded pilot produced 68 summaries. Exact canonical title/part normalization has since recovered 18 more: the current pilot contains 86 summaries (Street Hawk 12, Knight Rider 0, Gargoyles 74). This implements the obvious title-format equivalences below; the provider-order crosswalks and spelling alias remain recommendations. Counts describe this catalog/provider snapshot, not measured retrieval quality.

## Concrete reconciliation candidates

Confidence describes metadata identity, not independent confirmation of the video contents.

| Catalog identity | Provider identity | Finding and recommended resolution | Confidence |
| --- | --- | --- | --- |
| Knight Rider `episode-294`, “Deadly Maneuvers,” S01 E03 | TVmaze `74138`, [“Deadly Maneuvers,” S01 E02](https://www.tvmaze.com/episodes/74138/knight-rider-1x02-deadly-maneuvers) | Alternate multipart counting. Catalog `episode-292` labels the preceding premiere E01–E02; TVmaze represents that premiere as one episode. Approve an explicit episode mapping while retaining both numbering systems. | High |
| Knight Rider `episode-368`, “A Good Knight's Work,” S02 E20 | TVmaze `74177`, [“A Good Knight's Work,” S02 E18](https://www.tvmaze.com/episodes/74177/knight-rider-2x18-a-good-knights-work) | Alternate counting changes within the season. The catalog labels “Goliath Returns” E18–E19, while TVmaze represents it as E17. Use an explicit mapping rather than a universal offset. | High |
| Gargoyles `episode-c002bbe1-c18b-4ff0-823b-feb5d13ff1a8`, “Awakening, Part 2,” S01 E02 | TVmaze `158087`, [“Awakening: Part Two,” S01 E02](https://www.tvmaze.com/episodes/158087/gargoyles-1x02-awakening-part-two) | Title normalization defect. The substring matcher selects the shorter “Awakening” episode `158086`, causing a reported numbering conflict. Normalize the terminal part expression and require exact base-title and part agreement. | High |
| Gargoyles `episode-25d8a6e6-7ac3-4225-9578-1cc8f2ffc42e`, “City of Stone, Part 1,” S02 E09 | TVmaze `158107`, [“City of Stone (1),” S02 E09](https://www.tvmaze.com/episodes/158107/gargoyles-2x09-city-of-stone-1) | Equivalent part notation. A constrained normalization of “Part 1” and “(1)” can recover this mapping while preserving season, episode, base title, and part identity. | High |
| Street Hawk `episode-1640`, “The Adjuster,” S01 E03 | TVmaze `480451`, [“The Adjustor,” S01 E03](https://www.tvmaze.com/episodes/480451/street-hawk-1x03-the-adjustor) | Spelling difference with matching series and numbering. Record a reviewed, show-specific alias. Do not introduce unrestricted fuzzy matching. | High |

## Whole-story scope finding

Knight Rider `episode-376`, “Knight Of The Drones (1),” is 2,711.17 seconds; `episode-378`, part 2, is 2,878.34 seconds. TVmaze episode `74182`, [“Knight of the Drones,” S03 E01](https://www.tvmaze.com/episodes/74182/knight-rider-3x01-knight-of-the-drones), has a 120-minute runtime and represents the whole premiere. The earlier matching rules accepted part 1 because its numbering and base title agreed. The runtime scope guard now excludes that candidate, leaving zero Knight Rider summaries in this pilot.

A whole-story synopsis must not be presented as a synopsis specific to either part. A future whole-story evidence mode would require explicit scope labeling and its own reviewed mappings. Broadcast-slot runtimes and ad-free video durations differ, so runtime is supporting evidence rather than an episode identifier.

## Recommended matching policy

### Safe deterministic automation

Preserve strict matching as the default. Candidate generation can normalize punctuation and terminal multipart notation into a base title and a separate part value. Support explicit equivalents such as “Part Two,” “Part 2,” and “(2)” without dropping the part value. Require an exact canonical title, matching part, matching season and episode, a reviewed provider show identity, and a unique provider candidate before accepting an automatic mapping. A bare base title must not override an explicit part number.

Exact extracted-title matching with season and episode agreement can also support short titles. Gargoyles “Vows,” “M.I.A.,” and “Turf” initially failed the normalized-title minimum length. The current matcher recovers these through exact title comparison after removing known catalog wrappers; unrestricted substring matching remains unsuitable.

Retain standalone-source and runtime scope checks. Preserve the provider episode identifier and source URL in accepted evidence. Missing provider summaries remain excluded; matching improvements cannot supply absent licensed text.

### Reviewed identity crosswalk

Use a separate reviewed crosswalk for numbering differences and spelling aliases. Bind each decision to the catalog episode identifier and source identity, the provider show and episode identifiers, the catalog revision or relevant identity fingerprint, and the evidence supporting the decision. Preserve original catalog numbering alongside provider numbering. Revalidate a mapping when its source identity or relevant metadata changes.

Generate crosswalk candidates automatically, but require review for alternate ordering, spelling aliases, duplicate titles, missing part identity, and many-to-one mappings. Approve the Knight Rider series of mappings as explicit rows rather than deriving them from a single offset: the season-two offset increases after successive multipart stories.

### Manual review boundaries

VHS compilations, multi-episode files, unaired versions, remakes, and different cuts require explicit identity and scope review. Do not infer that a compilation is a standalone episode from one matching title. Do not transfer evidence between remakes based on franchise names. Catalog corrections require evidence that the catalog is wrong; a provider's different numbering alone is insufficient.

## Implementation boundary

This document records an independent read-only assessment and proposed reconciliation policy. It does not authorize catalog publication, change catalog values, or add provider mappings. The current runtime guard is an existing pilot protection; canonical title and part normalization is now implemented; provider-order crosswalks and the spelling alias remain recommendations.
