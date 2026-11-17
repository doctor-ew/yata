## Code Review (nightshift-review)

**Task:** episode-retrieval-pilot
**Date:** 2026-11-17
**Mode:** post-implementation, explicitly scoped working-tree review
**Branch:** feature/episode-retrieval-pilot
**Base HEAD:** 03665fe69837fb37f12e1f673945563284888f71
**Reviewer:** independent Codex agent using the installed Nightshift six-lens instructions

### Scope and evidence

Reviewed the acceptance criteria in SPEC.md and 16 implementation/test/configuration files: services/retrieval/core.py, budget.py, handler.py, ingest.py, test_retrieval.py, requirements.txt and requirements-lock.txt; deploy/retrieval/assets.yaml and stack.yaml; scripts/build-retrieval.py, deploy-retrieval.py, run-retrieval-pilot.py and build-episode-evidence.mjs; src/episode-evidence.mjs; test/episode-evidence.test.mjs. The implementation is new and uncommitted; scope was taken from the requested paths and working tree rather than an empty committed diff. No review-cache reuse.

The Nightshift context check completed. TDD integrity reported SKIPPED because no lock SHAs exist; this review does not claim sealed RED-phase provenance. Read-only tests passed: 11 Python retrieval/deployment tests using /tmp/yata-arcade-deploy-venv/bin/python and 8 JavaScript evidence tests. The default system Python lacked boto3 and could not import the deployment test module; the dependency-equipped environment passed all 11 tests. No AWS resource, IAM, content or model mutation was performed by the reviewer.

### DRY

No blocking findings. Search and ingestion share the bounded Runtime transport, embedding validation and atomic allowance helper. Their distinct handlers and IAM roles remain explicit.

### SOLID

No blocking findings. Infrastructure lifecycle, artifact creation, evidence generation, ingestion and search have separate entry points. No public API contract or provider-wide abstraction is claimed.

### ACID

No remaining findings. Planning now has a 300-second deadline and execution has a 1,200-second deadline. The initial unbounded-planning warning is resolved. Deployment tests verify that a stale complete stack cannot finish a different change set and that replacing-resource plans are not executed.

The initially reported blocking defect was repaired during review: completion now requires the exact executed change set to report EXECUTE_COMPLETE as well as a complete stack. A prior complete stack alone is insufficient. CloudFormation [ExecuteChangeSet](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_ExecuteChangeSet.html) and [DescribeChangeSet](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_DescribeChangeSet.html) define the relevant operations/status field.

Monthly and daily allowances plus the unique reservation receipt are written in one conditional DynamoDB transaction before model invocation. Ambiguous/failed calls are not refunded and model clients disable automatic retries. These are conservative pre-call reservations, not an exact total AWS bill ceiling. Query/storage/log charges are not fully metered by that allowance.

Ingestion writes a revision-specific vector namespace and publishes current.json only after every put succeeds. Earlier vectors remain intact. Tests demonstrate no activation after a mid-ingestion failure. Actual AWS visibility, IAM execution and retrieval quality remain live acceptance checks, not established by mocks.

### CoC

No blocking findings. New resources and IAM policies are defined in the two CloudFormation templates. Content and immutable deployment artifacts are data uploads. Evidence, vectors and allowance storage use retention policies; log groups use explicit seven-day retention. Retained resource replacement is rejected by the deployment script and would require a reviewed migration. There are no function URLs or unauthenticated HTTP resources in the reviewed templates.

### Big O

No findings. The pilot bounds the corpus to 150 documents, vectors to 512 dimensions, vector candidates to 10 and returned results to 5. Local lexical work and ranking are bounded. Cache misses reserve before embedding; exact-title hits avoid model work.

### LLM Trust Boundary

No remaining findings. The upload runner now sends the catalog and document references over stdin to a fixed Node subprocess program. That program reuses validateCatalog, standaloneEpisode and stationSource before any upload. No source text is interpolated into executable code or shell arguments. The publication-binding warning is resolved.

Search has no vector/evidence write or ingestion-invocation permission. QueryVectors and GetVectors are constrained to the exact pilot index; the read permission does not confer vector writes. Its writes are scoped to the dedicated allowance/cache table namespace. Ingestion writes only the dedicated embedding cache/current pointer and vector index; neither role grants public access. No Pensieve resource or private library provider is referenced.

The evidence generator preserves finite show/episode/source IDs, catalog revision, provider mapping and source URL. The private runtime rechecks corpus/record hashes and returns only matching current-corpus evidence IDs from vector results. It emits candidate provenance and whole-episode spoiler scope, without generated prose or playback URLs. Current-catalog revalidation at a future public playback boundary remains mandatory; private pilot approval does not authorize returning stale corpus identities directly to a player.

Local lexical ranking is implemented in Python. The reviewed CloudFormation pilot does not configure S3 Vectors full-text search. No transcript, scene alignment, timestamp recap or unsupported factual-answer capability is established by summary retrieval. Explicit exact-dialogue/playhead/timestamp request patterns now return unsupported-scope before runtime initialization or paid work; this is a bounded scope guard, not exhaustive natural-language intent recognition.

### Final additions reviewed

Canonical installment matching normalizes Part Two, Part 2 and parenthesized installment numbers while preserving part identity and checking season/episode agreement. Runtime ratios reject split-media versus whole-premiere summary mismatches; multipart records without provider runtime abstain. Eight evidence tests cover these additions. Current generated corpus counts were supplied by the implementation owner; the reviewer did not independently regenerate or inspect the full 86-record corpus in this pass.

The dry-run deployment path now removes only the CREATE placeholder identified by this invocation after verifying its resource list is empty. Existing foreign stacks still fail the initial ownership check. The reviewer did not exercise deletion against AWS; the two deployment tests exercise stale completion and resource-replacement rejection, not the new placeholder cleanup branch.

### Summary

- BLOCK: 0 (HIGH: 0, MEDIUM: 0)
- WARN: 0
- NOTE: 0

### Trend

Re-review: BLOCK remains 0; WARN decreases from 2 to 0. The deployment-completion blocker and both warnings are repaired. The new deployment regression tests are included in the rerun. No prior accepted review-cache record was reused.

### Verdict

APPROVE for the private IAM-only episode-summary pilot implementation. No unresolved findings in the reviewed scope. This is source review approval, not evidence that deployment, ingestion, IAM-denial checks, caching or remembered-plot evaluation has passed. It is not approval for public paid integration, child profiles, store submission, native attestation or a new APK release.
