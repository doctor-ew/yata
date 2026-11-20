# Episode summary coverage expansion

## Scope

The evidence builder uses reviewed TVmaze series identities from the library artwork metadata and the current published catalog. The 2026-11-19 build contains 4,192 checked standalone episode summaries across 114 series. It considered 252 reviewed series identities. The catalog contains 269 shows and collections; coverage is partial. The per-series inclusion and exclusion counts are in [the coverage report](coverage-2026-11-19.json).

This corpus contains episode metadata and whole-episode summaries. It does not contain video, scripts, captions, scene timestamps or current-playhead evidence. Unsupported dialogue and timestamp questions continue to abstain.

## Identity reconciliation

A unique canonical episode title can reconcile different provider and catalog episode numbers only within the same season, with a known compatible runtime and a checked standalone source. Multipart titles, ambiguous titles, short generic titles and conflicting seasons remain excluded. The evidence retains both numbering systems and the provider citation under the explicit `canonical-title-numbering-variant` method. No season offsets or plot-to-episode rules are applied.

Leading title articles are normalized generically. For example, a provider's title beginning with “A” can match the same full catalog title with that article omitted. These rules apply to every series.

## Query bounds

Jev receives a bounded candidate shortlist. An explicitly named series is derived from corpus titles and receives up to 100 summaries. Other questions receive up to 40 candidates ranked by lexical evidence. The serialized provider request is limited to 48,000 UTF-8 bytes. Broad questions without a named series therefore have lower recall than a search across every summary. No full-corpus prompt is sent to Jev. A strongly supported question with a split choice distribution can return two or three sourced possibilities for manual selection. Exact-selection thresholds remain unchanged; unsupported stories and a single uncertain guess still return no selection.

## Activation and recovery

Ingestion stages 200 documents per IAM-only Lambda invocation, with four embedding I/O workers. Completed embeddings are written to S3 Vectors in batches of 25. Allowance transactions from workers in the same container are serialized. A completed chunk writes a private receipt containing its expected evidence-ID digest. The final invocation verifies every preceding receipt before updating the active corpus pointer. Interrupted ingestion leaves the previous active corpus in place. Cached embeddings are reused on retry. The runner retries only explicit Lambda invocation throttles with bounded backoff; ambiguous function failures stop the run. An operator can resume at a completed 200-document boundary using `--ingestion-start`.

The CloudFormation change adds private ingestion receipt access to the existing ingestion role and updates the existing Lambda code. It adds no public endpoint, database instance or scheduled worker. Existing monthly and daily reservation limits remain enforced.

## Cost basis

The complete build contains 1,218,305 UTF-8 embedding-text bytes. Its conservative embedding reservation is 32,496 micro-USD ($0.032496), before retries and ancillary service usage. This uses Titan Text Embeddings V2's documented $0.02 per million tokens, one token per UTF-8 byte as a conservative bound and a 25% margin with per-document rounding. [AWS pricing source](https://aws.amazon.com/blogs/machine-learning/get-started-with-amazon-titan-text-embeddings-v2-a-new-state-of-the-art-embeddings-model-on-amazon-bedrock/).

The ingestion command rejects a reviewed corpus whose calculated reservation exceeds $1. Query reservations remain $0.01 per paid operation. Reservations are conservative accounting guards, not a claim about the final AWS bill. Lambda, S3, DynamoDB, vector storage and Jev usage are separate charges.

## Validation

The matcher suite passed 10 tests. The retrieval suite passed 37 tests in normal and optimized Python modes. Checks cover numbering provenance, ambiguity rejection, multipart/runtime safeguards, Unicode reservation bounds, bounded Jev requests, concurrent ledger writes and fail-closed activation receipts.

The active corpus pointer was read back after all 4,192 documents completed staging. Corpus revision: `34445e3e8c7269a10880c8529232c174abfaf0fb2a1f5e8a70fe06189d7edcf3`. Catalog revision: `aa5adc5243ae04ef039595851f5ac18ad0b360f7d4b45b1d9fb204bf09043c06`. The deployed Lambda artifact SHA256 is `54ad79f37f84ea8d2e920b93933ff68b07d1d7618947d22ccfafdfe8737bc7f8`.

Actual IAM-authorized Search Lambda calls produced these outcomes:

| Request | Outcome |
| --- | --- |
| Knight Rider episode fighting a motorcycle gang | Two sourced possibilities: Good Day at White Rock and The Wrong Crowd; no exact selection |
| Greatest American Hero episode where Ralph loses his memories | A Train of Thought |
| Gargoyles magical mirror and Puck | The Mirror |
| Invented Gargoyles pineapple mayor plot | No result |
| Exact dialogue at a timestamp | Unsupported scope; no result |

The two Knight Rider summaries describe different motorcycle-gang stories. Jev reported strong storyline support but split its choice distribution. Those results remain manual choices. The repeated request reused the cached distribution. The current backend validator, companion response normalizer and catalog-source revalidator each retained exactly those two authoritative episode/source identities. No playback operation was called during this check. The existing frontend adapter suite passed seven tests and the backend retrieval adapter suite passed eight tests.

The expected episode fixtures are source-aware acceptance checks rather than blind retrieval evaluation. The [acceptance report](acceptance-2026-11-19.json) records the returned evidence identities. These service and adapter checks do not establish a physical browser or device chat session.

The monthly reservation ledger increased from $1.260000 before this work to $1.382496 after ingestion and acceptance/diagnostic calls, a $0.122496 reservation increase. That includes the $0.032496 embedding reservation and paid query/diagnostic reservations. AWS billing totals were not measured; ancillary service charges remain separate.
