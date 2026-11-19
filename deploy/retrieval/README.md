# Episode retrieval infrastructure

## Boundary

CloudFormation owns every new resource and IAM policy in this pilot. `assets.yaml` owns the private artifact bucket/policy. `stack.yaml` owns private evidence storage/policy, the S3 vector bucket/index, on-demand allowance/cache table, two execution roles, two IAM-only Lambda functions and seven-day log groups. There is no function URL, direct public retrieval route, VPC, NAT gateway or always-on database. The guarded companion integration now invokes search from the existing chatbot route; see [the bridge architecture](../../docs/buddy-retrieval/ARCHITECTURE.md).

Deployment credentials belong to the operator's AWS session. No credentials are stored in code, APK assets, outputs or receipts. Existing web/AI infrastructure is outside these two stacks.

## Build and deploy

Use a task virtual environment outside the repository. Install the pinned requirements from `services/retrieval/requirements-lock.txt` using that environment's Python. Run:

```sh
python scripts/build-retrieval.py --out /tmp/yata-retrieval/retrieval.zip
python -m unittest discover -s services/retrieval -p 'test_*.py'
node --test test/episode-evidence.test.mjs
python scripts/deploy-retrieval.py --artifact /tmp/yata-retrieval/retrieval.zip --receipt /tmp/yata-retrieval/deployment.json
python scripts/deploy-retrieval.py --artifact /tmp/yata-retrieval/retrieval.zip --receipt /tmp/yata-retrieval/deployment.json --apply
```

The deployer verifies the configured AWS account, validates templates, builds CloudFormation change sets, checks existing stack ownership and rejects resource removal/replacement. A first dry run plans the artifact stack; applying it permits planning/deployment of the dependent service stack. Resource changes are always executed through CloudFormation. Source/SDK changes produce a new content-addressed ZIP and update the functions through the template's artifact parameters.

Receipts preserve prior templates/parameters on updates and the resulting stack outputs. Execution completion is tied to the specific change set, not a stale previous COMPLETE status. Review failed stacks before retrying; do not overwrite a foreign or incompletely rolled-back stack. Retained resources are intentionally not deleted automatically.

## Corpus and ingestion

```sh
node scripts/build-episode-evidence.mjs --out /tmp/yata-retrieval/corpus
python scripts/run-retrieval-pilot.py --deployment /tmp/yata-retrieval/deployment.json --corpus /tmp/yata-retrieval/corpus/evidence.json --out /tmp/yata-retrieval/ingestion.json
```

The generator verifies the authoritative shared catalog and matches checked standalone episodes to TVmaze records. It rejects ambiguous identity, numbering, collection and runtime-scope conflicts. Obvious exact-title equivalents, including part-number words/digits and punctuation, are normalized without dropping the part number. Catalog titles/numbers are not rewritten.

The uploader rechecks the current catalog SHA, revision, identities and canonical JavaScript source/standalone eligibility. It uploads the complete corpus under its SHA256 key. The writer accepts at most 12,000 documents / 16 MB, processes 200-document resumable chunks and caches embeddings by evidence identity/model. Each chunk writes a private content-bound completion receipt. The final chunk validates every preceding receipt before activation. Vector keys include corpus revision so staging cannot overwrite the active edition's keys. Only a fully ingested edition updates the private current pointer. Failed ingestion leaves the old active edition; retry can reuse completed embeddings. Content uploads are data operations, not unmanaged resource provisioning.

TVmaze attribution, source references and CC BY-SA provenance remain attached. Provider snapshots, full summaries and derived vectors stay private. Publication/redistribution of new enrichment is a separate decision. No scripts from the researched directories are ingested.

## Query and evaluation

Invoke the `SearchFunction` output through AWS IAM with a JSON object containing `query` and optional `limit` (1–5). It returns finite catalog/evidence identities, bounded summary excerpts and publisher references. Results are candidates with whole-episode spoiler scope; the pilot does not generate answers or media URLs. Exact dialogue/playhead queries abstain. A future app playback action must re-resolve the identities against its current catalog.

A reviewed local evaluation file can be supplied with `--evaluation` to `scripts/run-retrieval-pilot.py`. Record top1/top5, unsupported negatives, caching and latency; source-aware fixtures are not a blind quality benchmark. Do not treat a successful nearest-neighbor query as proof the requested plot is present.

## Cost controls

Default monthly pre-call allowance is $3 and daily allowance $1, both represented in microdollars. Each attempted embedding reserves a conservative $0.01 atomically against both periods and a unique receipt before Bedrock is called. Failed/ambiguous model attempts are not refunded. Model retries are disabled. Ordinary exact-title lookup and cached semantic queries do not invoke Bedrock.

This allowance is deliberately conservative accounting, not an exact AWS-billing cap or current embedding price. S3 storage/operations, DynamoDB, Lambda and logs have their own usage charges. IAM-only invocation, small corpus/result/input bounds, reserved concurrency (search 2 / ingest 1), cached embeddings/results and short log retention keep the pilot limited. Public exposure requires the existing session/abuse controls plus an explicit public spend policy. Allowance exhaustion falls back to keyword results and must not be advertised as successful semantic retrieval.

## SDK and full-text support

The bundled SDK is boto3/botocore 1.44.4. Its service model exposes S3 Vectors full-text/hybrid options. The regional CloudFormation index resource schema checked during this deployment exposes vector metadata exclusions but not full-text configuration. This template therefore does not configure native S3 BM25: the pilot combines Lambda keyword ranking with S3 vector retrieval. Adding native full-text needs a supported declarative resource schema or a reviewed CloudFormation custom resource; do not patch it manually outside IaC.

## Retirement and follow-up

Evidence, vector data, allowance table and artifacts use Retain policies to prevent accidental loss during migration/rollback. Log groups retain seven days. Removing a stack is not a data-erasure operation: inventory retained resources and use a reviewed retirement/migration plan. No automated vector-generation garbage collection is enabled for this small pilot.

Next gates: service-side current-catalog/profile enforcement for public access, guarded session integration, native attestation, grounded companion answers with validated citations, a spoiler policy, wider source reconciliation and authorized time-aligned captions. These are not supplied by this infrastructure release.

## Optional Jev experiment

The TypeSafe strategy is opt-in and remains IAM-only. The existing local TYPESAFE_API_KEY is supplied to the CloudFormation NoEcho parameter only when explicitly configuring the experiment; CloudFormation creates the Secrets Manager secret and exact-secret read policy. Only the search role can read it. Lambda environment variables contain its ARN, never the credential. The writer role cannot read it. Receipts redact the credential parameter, and source/ZIP assets contain no credential.

```sh
python scripts/deploy-retrieval.py --artifact /tmp/yata-retrieval/retrieval.zip --receipt /tmp/yata-retrieval/deployment.json --daily-allowance-microusd 2000000 --enable-jev --configure-jev --apply
python scripts/search-episodes.py --strategy jev --query 'Which story involves a magical mirror changing everyone’s species?'
python scripts/search-episodes.py --compare --query 'Which story involves a magical mirror changing everyone’s species?'
```

Use --configure-jev only for initial configuration or deliberate credential rotation. Subsequent updates preserve the NoEcho parameter with UsePreviousValue. --enable-jev controls the strategy; omitting it disables Jev without deleting the retained credential. CloudFormation rejects enabled-without-credential configurations. Secrets Manager adds its own storage/API charges; see its official pricing. The current pilot uses a $2 daily conservative allowance during evaluation and the unchanged $3 monthly allowance. These are not actual bills. Development MCP calls are separate from deployed-Lambda accounting.

The direct API uses the verified jev-latest alias and records the returned model in cached decisions. That alias can move; reevaluate before public release. A Choice selects from the exact supplied evidence IDs plus an explicit none option. A companion Noul checks whether any evidence supports the story. The validator requires a complete normalized choice distribution, adequate support/confidence/margin and known IDs. Provider text/actions/URLs never become playback commands. Calls use fixed HTTPS, reject redirects, have bounded UTF-8 bodies/timeouts and do not retry. Failure does not silently invoke a second paid provider.

The Jev strategy receives a query-specific bounded shortlist, rather than the entire corpus. Explicit series scope is derived from corpus show titles; a named series can provide up to 100 candidates when its UTF-8 state fits the 48 KB complete-request preflight envelope. Other requests use at most 40 lexical candidates. The hybrid strategy starts from 10 vector candidates. Report those candidate-pool differences when comparing results; broad unsupported plot recall remains an evaluation limitation.

[TypeSafe API](https://docs.typesafe.ai/api/system-one) · [Secrets Manager pricing](https://aws.amazon.com/secrets-manager/pricing/)

## Guarded companion integration

The existing buddy route now has an opt-in summary retrieval path. The search function itself remains IAM-only. See [companion architecture](../../docs/buddy-retrieval/ARCHITECTURE.md) for the public-session boundary, exact-function IAM bridge, shared-role limitation, native response transport and current coverage. The private pilot results above remain development measurements.

## Catalog-scale evidence and ingestion allowance

`build-episode-evidence.mjs --shows all` uses reviewed TVmaze identities from the current artwork feed and the authoritative public catalog. It preserves standalone-source exclusions. Unique normalized full titles can reconcile same-season episode-number variants only when runtime and multipart scope agree; catalog/provider numbers remain distinct in provenance. Generic short labels, ambiguous titles, cross-season matches and unsupported multipart identity remain excluded. Leading articles and numeric/spelled multipart labels normalize generally; no plot-to-episode rules are embedded.

Online query/Jev attempts retain the existing one-cent conservative reservations and monthly/daily caps. Ingestion-only embedding reservations are computed from bounded UTF-8 byte length: one token per byte, at $0.02/million tokens plus 25% margin, rounded up to microUSD. The CLI refuses a reviewed ingestion whose summed reservation exceeds $1. This is an embedding allowance, not an AWS bill cap; storage, vectors, Lambda and DynamoDB are separate usage charges. Price basis: https://aws.amazon.com/blogs/machine-learning/get-started-with-amazon-titan-text-embeddings-v2-a-new-state-of-the-art-embeddings-model-on-amazon-bedrock/ .

Checkpoint objects are private `ingestion/<corpus revision>/<start>.json` data. Their read/write IAM permissions are declared in CloudFormation. No public route, writer role, model permission or client credential is added. Failed/partial work leaves the previous corpus active.
