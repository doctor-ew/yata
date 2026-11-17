# Episode knowledge and search proposal

Status: metadata/transcript retrieval remains proposed. Global catalog-title search is implemented for the 0.8.7 release. Source review: 17 November 2026.

## Objective

Let the existing companion answer grounded questions about the selected episode and help locate catalog episodes from remembered characters, scenes, or dialogue. Preserve character voice, source attribution, playback control boundaries, and explicit spoiler preferences.

## Existing implementation

| Area | Current behavior | Source |
| --- | --- | --- |
| Episode identity | Validated show, episode, and source identifiers; episode title, season, number, runtime, and kind. The catalog does not retain synopsis, cast, or transcript fields. | `src/domain.mjs` |
| Description lookup | `createEpisodeLookup().summary` reads TVmaze episode lists using `tvmazeId` from artwork metadata. `matchEpisode` requires an unambiguous title match, or a conservative title-less numbering fallback. | `src/episode-information.mjs`, `data/library-art.json` |
| Captions | `subtitleFiles` selects public Archive SRT/VTT files with names matching the selected video. `toWebVtt` converts SRT timing. This is discovery and presentation, not a transcript search index or rights clearance. | `src/episode-information.mjs` |
| Episode UI | Displays the matched description and attribution, adds available tracks to Archive video, and directs YouTube viewers to the embedded player's CC control. | `src/episode-information-ui.mjs` |
| Playback | `playEpisode` records the selected show, episode, source, and offset. Both video and YouTube sessions expose readiness, current time, duration, and playlist state. | `src/app.mjs`, `src/players.mjs` |
| Buddy context | Receives bounded structured current/next titles and a checked title shortlist. It does not receive authoritative episode/source identity, playhead position, retrieved evidence, or conversation history. Visible conversation bubbles are not a retrieval context. | `src/buddy-ui.mjs`, `src/buddy-context.mjs`, `src/app.mjs` |
| Global title search | Searches show/episode/story titles with library filters and bounded results. Revalidates catalog identities before direct playback; collections remain labelled. No plot or transcript retrieval. | `src/episode-search.mjs`, `src/episode-search-ui.mjs` |
| AI transport | Current request modes are buddy and channel. Native requests use an origin-checked website iframe; grants stay inside it. | `src/channel-ai.mjs`, `src/buddy-service-client.mjs`, `src/buddy-service.mjs` |
| Scene links | `createEpisodeLink` accepts the show identifier, verified source URL, and seconds. `findSharedEpisode` resolves the descriptor against the catalog. | `src/share.mjs` |

The existing episode matcher and caption tests are in `test/episode-information.test.mjs`. No tests were run for this documentation-only investigation.

## Recommended first increment

Start with current-episode identity and cast questions, not unrestricted transcript ingestion. Example requests: “What episode is this?”, “Who plays that character?”, and “What else in YATA has that actor?”

1. Provide a structured playback-context adapter from application state to the companion. Do not read episode identity from display text. Include catalog revision, selected identities, readiness, player position, and spoiler choice. These are proposed contract requirements; no new API field names are specified here.
2. Resolve those identities against the server's authoritative catalog. Treat client position as a user-experience preference, not an authorization signal. Do not accept caller-provided source URLs or evidence as trusted retrieval instructions.
3. Build a small versioned metadata sidecar with reviewed episode-provider matches and credited cast/character records. Keep enrichment outside the current catalog until its contract is deliberately versioned: current validation drops unknown enrichment fields.
4. Retrieve only the records necessary for the question. Use exact identifiers, normalized names, and lexical search first. A cast relationship lookup does not require embeddings or an LLM.
5. Give the model a bounded evidence bundle, separated from instructions. Generate a short answer in the selected persona's voice, with evidence identifiers. Validate the returned references and render links from trusted records. Do not let the model manufacture URLs or playback actions.
6. Return a supported limitation when records are absent or ambiguous. A cast list cannot establish who is visibly on screen at the current second; “this guy” requires clarification unless scene-level evidence exists.

Use the existing guarded service and its quotas. Add a validated retrieval contract deliberately across web, native bridge, and backend rather than hiding new parameters inside the existing free-text question. Preserve old clients during rollout. No endpoint name is proposed in this document.

## Transcript pilot and search

After the metadata increment, select a small set of episodes with authorized, source-aligned timed captions. Inventory caption availability and rights before promising catalog-wide coverage. A publicly playable video or visible caption track does not by itself establish permission to retain, embed, or redistribute a transcript.

Store provenance, language, caption quality, content hash, exact episode/source mapping, cue times, and alignment status. A timestamp is meaningful only for that cut: rerun compilations, removed commercials, remakes, and alternative edits can shift timing. Deny scene jumps and position-limited recaps when alignment is unknown. Compilation items need explicit segment mappings before being treated as individual episodes.

Index bounded, overlapping cue groups with timestamps. Start quote/name search with lexical ranking; add semantic retrieval only if a labeled scene-search evaluation demonstrates an improvement. Keep embeddings and full scripts server-side. Return brief supporting excerpts and links rather than a transcript download. Restrict search results to catalog entries and distinguish unavailable content from playable sources.

“What did I miss?” should initially mean “recap up to the current position,” unless an actual previous-position bookmark supports a narrower interval. Do not claim to know what the viewer attended to.

## Spoiler and grounding rules

- Default current-episode chat to no spoilers beyond the current playhead. Capture identity and position once per question; discard a late answer if playback has moved to another episode.
- Filter evidence before retrieval results reach the model. Include only cues ending at or before the permitted position; do not provide a future-spanning chunk and ask the model to ignore its ending.
- Do not send whole-episode summaries, future episode titles, plot-revealing guest credits, or later-season character facts into a strict spoiler-safe answer unless reviewed as safe or explicitly permitted. General summaries are untimed and can reveal endings.
- If position is unavailable, the source is an unresolved playlist, or alignment is unverified, provide safe identity facts or explain that a spoiler-safe recap is unavailable.
- An explicit spoiler request can widen the evidence scope for that question. Global scene search can return minimal episode identification first, with plot details revealed on request.
- Treat retrieved documents, subtitles, and provider text as untrusted data. Embedded instructions must never change persona rules, tool permissions, account access, or playback.
- Require evidence for factual assertions; personality may change phrasing, not facts. Distinguish interpretation from sourced claims. Abstain rather than invent dialogue, cast, or production trivia.

## Data providers and permitted use

TVmaze already supplies YATA metadata. Its API supports cast/character pairs, episode guest cast, and person credits, which can support catalog cross-links. Its API data license requires attribution and compliance with ShareAlike. Preserve provenance and attribution in any enrichment publication; do not imply this license clears third-party video or script rights. [TVmaze API documentation](https://www.tvmaze.com/api)

IMDb's public datasets are offered for personal and non-commercial use under their terms. They include title/episode relationships, principals, and character names, but do not constitute an open script or plot corpus. Do not scrape IMDb pages or add its data to a distributed app by assumption; evaluate the applicable licensed product and intended use first. [IMDb dataset documentation](https://developer.imdb.com/non-commercial-datasets/)

The official YouTube caption-download API requires authorization and permission to edit the video. CC visible in an embedded player is therefore not a general transcript ingestion mechanism. Continue embedded CC support independently of knowledge indexing. [YouTube caption-download documentation](https://developers.google.com/youtube/v3/docs/captions/download)

Archive companion discovery is useful for a rights-reviewed pilot, but filename matching proves neither textual correctness nor permission. This investigation did not establish how many catalog episodes have usable companion tracks or rights-cleared scripts.

## Architecture and protection

Keep metadata ingestion, identity reconciliation, retrieval, answer generation, and rendering as separate components. Share versioned JSON contracts and behavior fixtures between JavaScript and future Swift clients. Keep provider credentials and indexing jobs out of the clients. Cache public metadata, bound query size and result count, and meter model work under the existing API guard. Retrieval results must not grant administrative privileges or execute changes to playback.

Do not log raw prompts, viewing history, or caption excerpts by default. Record aggregate success, unsupported-question, evidence-coverage, latency, and cost signals under the project's privacy policy. A source deletion or revoked permission must remove derived records and embeddings as well as raw text.

## Acceptance gates

| Gate | Required evidence |
| --- | --- |
| Identity | Ambiguous pilots, original/remake collisions, conflicting numbers, compilations, alternate cuts, and deleted catalog entries resolve safely or abstain. |
| Sources | Every factual answer reference resolves to an allowed evidence record; missing or fabricated references are rejected. |
| Spoilers | Boundary cues, future-spanning chunks, full summaries, later-season facts, backward seeks, unknown position, and explicit opt-in are covered by fixtures. |
| Freshness | Switching episode, source, or catalog revision invalidates stale answers and cached alignment. |
| Search | A labeled set of quote, character, scene, and no-result queries measures result quality. Add semantic indexing only after comparison with lexical retrieval. |
| Safety | Injection in query and retrieved content cannot invoke tools, fetch arbitrary URLs, expose secrets, or create playback actions. Oversized and burst requests are rejected before paid work. |
| Compatibility | Web and native bridge validate the same contract; older apps retain ordinary buddy chat. |
| Failure | Metadata outages, absent captions, uncertain rights/alignment, and exhausted quota yield a useful limitation without invented facts. |

Recommended implementation order: metadata-backed identity/cast pilot; source-aligned caption pilot; remembered-scene search; timestamped recaps; separately sourced production trivia. Do not advertise full-catalog episode knowledge before coverage is measured.
