# Episode retrieval pilot

## Acceptance criteria

- Version-controlled CloudFormation defines every new AWS resource and IAM policy. No manual resource provisioning. Artifacts and content remain separate immutable data uploads.
- Dedicated private evidence/vector storage; no reuse of Pensieve data and no public S3 access.
- Separate IAM-only search and ingestion functions. No function URL or unauthenticated API route. Search cannot write vectors/evidence or invoke ingestion.
- Pinned SDK bundled with functions. Document SDK versus CloudFormation capability differences.
- At most150 checked conservatively matched episode-summary records; no unauthorized scripts/transcripts. Activate only after complete ingestion; preserve old corpus vectors during publication.
- Atomic monthly/daily conservative pre-call allowances, no automatic model retries, bounded input/results, cached queries and small concurrency. These allowances are not an exact AWS bill cap.
- Candidate results carry provenance and finite catalog identities; no generated prose/playback URLs. Whole-episode summary spoilers identified; no scene/timestamp knowledge implied.
- Validate infrastructure, security/domain tests, actual ingestion, IAM invocation, caching and a small source-aware remembered-plot evaluation. Report coverage and abstention limits.
- Public paid integration is follow-up work: reuse guarded sessions, current-catalog/profile policy and title-search fallback. This private pilot does not imply a new APK release.

## Scope

Existing TVmaze metadata and the verified shared catalog. Script directories are assessed separately; no script rights established. No IMDb public database, transcription jobs, OpenSearch, NAT gateway or always-on database.
