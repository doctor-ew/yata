# Owner demonstration

## Access

Use an authenticated AWS owner session and the pinned Python dependencies described in the [deployment guide](../../deploy/retrieval/README.md). The command reads the checked-in private-pilot configuration; it does not expose a public API or embed credentials in the application.

```sh
python scripts/search-episodes.py --compare --query 'Which story involves a magical mirror changing everyone’s species?'
```

Compare finite episode identities, provider references, strategy, cache state, and latency. Repeat the query to demonstrate cached retrieval. Then ask an exact-dialogue or current-playhead question to demonstrate abstention. Results describe whole episodes and can contain spoilers.

## Explain the boundaries

The existing app searches episode titles. This private experiment adds summary-based retrieval using Lambda, S3 Vectors, Bedrock embeddings, and optional TypeSafe Jev evidence selection. It does not yet provide transcript search or public companion answers. All new resources and IAM policies are CloudFormation-managed. See [measured results](VERIFICATION.md) for fixture sizes, unequal candidate pools, and budget limits.
