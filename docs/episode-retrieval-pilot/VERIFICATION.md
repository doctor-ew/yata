# Episode retrieval pilot verification

## Deployed scope

CloudFormation owns two private stacks: `yata-retrieval-assets` and `yata-episode-retrieval-pilot`. The deployed artifact digest and physical outputs are recorded in [pilot configuration](../../deploy/retrieval/pilot.json). Both functions require AWS IAM invocation. No public route or function URL was created. The public website and APK do not call this pilot.

The active corpus contains 86 TVmaze episode summaries: 12 Street Hawk and 74 Gargoyles records. Evidence retains provider references and CC BY-SA provenance. Knight Rider mappings with unresolved numbering or runtime scope remain excluded. No scripts or transcripts were ingested.

## Retrieval measurements

| Fixture | Hybrid top 1 | Hybrid top 5 | Jev top 1 |
| --- | --- | --- | --- |
| Original eight development questions | 8/8 | 8/8 | Not measured |
| Five independently authored questions | 2/5 | 3/5 | 5/5 |

Both deployed strategies abstained on the two unsupported dialogue/playhead questions. Repeated queries used their respective caches. These are small, source-aware fixtures, not a blind benchmark. Hybrid starts with ten vector candidates; Jev can inspect all 86 summaries. The unequal candidate pools prevent an isolated model-quality comparison. Earlier hybrid thresholds failed seven of eight original questions; those development fixtures were used for tuning. The independent five were not used for subsequent tuning.

## Security and cost controls

Live checks confirmed private versioned evidence storage, all four S3 public-access blocks, and no public bucket policy. The vector bucket has no resource policy. Search can query the exact vector index but cannot write vectors, write evidence, or invoke ingestion. Only Search can read the exact optional Jev secret. No credential is present in the Lambda ZIP or client assets.

Atomic allowance rejection was exercised without a provider call: exhausted reservations changed neither period counter and created no receipt. The evaluation configuration reserves up to $3 monthly and $2 daily, with a conservative $0.01 reservation per attempted provider operation. This is accounting protection, not an exact AWS bill cap. Secrets Manager and infrastructure operations carry separate charges.

## Checks and limitations

Eighteen Python tests pass normally and under optimized execution. The reviewed implementation includes complete probability-map validation, bounded fixed-host HTTPS, no provider retries, current-catalog ingestion checks, and change-set-specific deployment completion checks. Scoped adversarial reports are in [REVIEW.md](REVIEW.md) and [JEV-REVIEW.md](JEV-REVIEW.md).

Public session integration, profile enforcement, grounded companion prose, spoiler policy, transcript retrieval, and physical iOS validation remain follow-up work. Source-aware summary search does not establish scene or quotation evidence.
