# Episode search and retrieval: budget architecture

Status: proposed infrastructure; global title-search client implemented. No new paid AWS resources provisioned by this change. Reviewed 17 November 2026.

## Decision

Ship catalog-title search first using the verified shared catalog. Add a separate, versioned evidence corpus for descriptions, credited cast/characters and an authorized caption pilot. Pilot S3 Vectors with on-demand Bedrock embeddings before committing to an always-on database. Keep retrieval behind an application-owned adapter so PostgreSQL with pgvector remains an alternative.

The user targets under $5/month incremental usage, with $15–25/month acceptable for a small server/database. These are planning envelopes, not guaranteed bills. Existing hosting, companion inference, data transfer, logs, ingestion and transcription costs are separate. Do not enable catalog-wide transcription or model-generated enrichment by default.

## Initial client behavior

The global search reads current catalog show and episode titles. It uses the same channel, genre, decade and availability filters as cards, renders up to 50 matches, and preserves collection labels. Playback resolves show, episode and checked source identities against the current catalog at click time. It does not search descriptions, scripts or caption text. The shared JavaScript ships in web, Android and iOS project assets; no platform-specific paid search dependency is introduced.

## Retrieval pilot

1. Match a small set of catalog episodes to provider metadata conservatively. Preserve provider references, catalog revision, match confidence and source provenance. Ambiguous matches stay unresolved.
2. Store reviewed evidence snapshots in private S3 objects. Do not put private Plex libraries, tokens or raw scripts in the existing public card feeds.
3. Ingest only changed evidence, identified by content hash. Keep embedding model/version and evidence revision with derived vectors. Embeddings are disposable indexes; evidence remains authoritative.
4. Retrieve exact identity and keyword matches before semantic candidates. S3 Vectors documents full-text BM25 and vector retrieval; validate regional feature availability, filters, latency and costs in the pilot before selecting it for production.
5. Resolve candidates to current authoritative catalog identities, apply availability/profile/spoiler policy, and return a bounded evidence bundle. No generated media URLs or arbitrary model-selected network calls.
6. Only explanatory companion answers invoke a generation model. Ordinary search returns results without paid generation. The answer must cite trusted evidence references; unsupported questions abstain. A model interprets a vague memory; application code chooses permitted playback actions.

For the event, demonstrate title search as the reliable fallback, followed by a small evaluated remembered-plot example with an explicit evidence card. Caption/quote search requires authorized, source-aligned captions and separate timestamp validation. Do not describe the whole catalog as transcript-searchable.

## AWS options and cost drivers

| Option | Fit | Budget consequence |
| --- | --- | --- |
| Existing S3/CloudFront and local catalog search | Immediate title search | No per-query model charge; existing delivery costs continue |
| S3 Vectors + Lambda + on-demand Bedrock embeddings | First semantic retrieval pilot | Usage-based vector storage/queries and model tokens; avoid an always-on database |
| PostgreSQL + pgvector on Lightsail | Hands-on relational alternative | Published Linux public-IPv4 plan: $12/month, 2 GB memory; backups/operations/model usage extra |
| RDS PostgreSQL + pgvector | Managed relational alternative | Instance, provisioned storage, backups and networking must be quoted for the selected region; no free-tier assumption |

AWS's S3 Vectors US East (N. Virginia) pricing example lists $0.06/GB-month storage, $2.50/million query requests, plus size-dependent processing and response charges. Returned-data allowances and billing minima apply; verify full-text-specific pricing during the pilot. A small index can be inexpensive, but query volume and evidence size must be measured.

AWS documents Titan Text Embeddings V2 at $0.02/million input tokens in its cost-optimization example. At that rate, 12,000 descriptions averaging 300 tokens cost approximately $0.072 for one embedding pass. This is an illustrative embedding-only calculation, not a current account quote or end-to-end RAG cost. Generated answers, transcription and reprocessing are separate.

Athena's published SQL example uses $5/TB scanned. It can be economical for partitioned analytics; it is not the proposed interactive episode-search path. No Athena, OpenSearch or Aurora deployment is required for this increment.

## Cost and abuse controls

Keep AWS permissions and model access server-side. Reuse the existing session/request controls, but do not describe request quotas as an exact monetary cap. Before enabling public paid retrieval: add per-request token/output bounds, a pilot corpus/ingestion limit, concurrency limits, response caching scoped to catalog/evidence revisions, and a pre-call budget reservation with a conservative cost allowance. Reconcile usage and stop paid calls when the allowance is exhausted. Budget alerts supplement this control; they are not an immediate billing stop. Fall back to title search on quota exhaustion or service failure.

Do not use a public database port or a service credential embedded in an APK. PostgreSQL is not a client-facing API. Preserve the future authenticated account/library boundary for Plex. Mobile attestation and exact spend enforcement remain readiness work.

## TMDB and TheTVDB

TMDB is the preferred next enrichment candidate alongside existing TVmaze data. Its developer API is free for non-commercial use with required attribution, an approved logo and the prescribed non-endorsement notice in About/Credits. The provider defines commercial projects by their primary revenue purpose; voluntary support does not independently settle the classification. Review accepted API terms for caching, retention and derived indexing before bulk ingestion. Keep credentials server-side. The documented TV episode details and series content-ratings methods fit the intended enrichment. Series ratings remain jurisdiction-specific and do not classify every archived source edit.

TheTVDB is a secondary candidate for coverage and episode-order differences. Its published API information describes project licensing and discounts for free/open-source projects, and requires visible attribution unless otherwise approved. No project license price or blanket free access is assumed. Confirm the project terms before using it in a shared cache or public retrieval service. Public page availability is not API authorization.

Cross-provider matches require original-series identity and provider-specific episode order, not season/episode numbers alone. Compilations need reviewed story mappings. New enrichment must preserve source, retrieval date and match evidence rather than overwrite one provider with another silently.

- [TMDB API FAQ and attribution](https://developer.themoviedb.org/docs/faq)
- [TMDB TV episode details](https://developer.themoviedb.org/reference/tv-episode-details)
- [TMDB series content ratings](https://developer.themoviedb.org/reference/tv-series-content-ratings)
- [TheTVDB API and licensing](https://thetvdb.com/api-information)

## IMDb source boundary

The free downloadable datasets provide title/episode relationships, people, principal credits/character names and user scores. They do not provide plots, scripts, dialogue, full cast coverage or TV parental classifications. The adult-title flag is not a parental rating; user scores are not suitability labels.

IMDb permits personal local dataset copies subject to its terms. Its published software-use conditions restrict republishing or repurposing those datasets as an online/offline movie-information database except for individual personal use. An ad-free public app is not automatically cleared by that exception. Keep a potential IMDb importer isolated from public publication and embeddings until appropriate permission/licensing is established. IMDb offers a licensed GraphQL API via AWS Data Exchange; no subscription has been purchased and no price is assumed.

Use the existing TVmaze integration as the first public metadata provider with required attribution/ShareAlike compliance. Retain provider-independent internal identities so a licensed IMDb adapter can later supply reviewed enrichment without rewriting clients. Do not scrape IMDb pages for missing plots or captions.

- [IMDb dataset documentation](https://data.imdb.com/non-commercial-datasets/)
- [IMDb software-use conditions](https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX)
- [IMDb licensed API](https://data.imdb.com/documentation/api-documentation/)

## Voluntary support

Recommend a quiet web-footer/About link labelled “Keep YATA on the air” or “Buy Drew a coffee.” Use a hosted checkout; no payment form or payment SDK is needed in YATA. Support should not unlock content, improve search priority or remove limits. Do not have companions solicit tips during playback.

Buy Me a Coffee publishes a 5% platform fee plus payment-processing/payout charges. The creator creates an account, completes payment onboarding, and supplies the verified public profile URL before the link is added. No account or payment destination has been created here. Native store payment/link behavior must be reviewed for the release storefronts; do not copy the web checkout link unconditionally into every store build.

## Primary references

- [S3 Vectors pricing](https://aws.amazon.com/s3/pricing/)
- [S3 Vectors full-text configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-configuring-full-text-search.html)
- [Bedrock cost optimization and embedding example](https://aws.amazon.com/blogs/machine-learning/optimizing-costs-of-generative-ai-applications-on-aws/)
- [Titan embeddings model documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html)
- [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)
- [RDS PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [RDS PostgreSQL extension versions](https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-extensions.html)
- [Athena pricing](https://aws.amazon.com/athena/pricing/)
- [Buy Me a Coffee fees](https://help.buymeacoffee.com/en/articles/8105744-how-to-calculate-charges-on-your-payment)
- [Apple payment guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
