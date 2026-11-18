# Remote roster verification

## Automated and service checks

286 Node tests pass, including strict schema, pin restoration without cache, unknown-field rejection, alias/host/portrait updates, hover lines, offline cache and analytics compatibility. Thirty retrieval/publication Python tests pass normally and with optimized execution. Repository syntax checks and Android debug build pass. Scoped review approved after repairs; see REVIEW.md.

The publication guard checked all 48 current identities against the deployed buddy backend, receiving the expected invalid-session denial. No model call was made by these canaries. Public code hashes match the verified local source and bundled native assets. No catalog, IAM or backend personality change was required.

## Browser checks

Chrome loaded a test-only profile absent from the bundled roster through an intercepted data feed. Its alias selected and pinned it; the pin survived a reload with network feed failure. A missing remote portrait fell back to the packaged Twiki portrait. An isolated real channel-builder request remained active across a same-host roster refresh and completed its reviewed plan. The synthetic extra profile was not published or used for a paid chat request.

## Native and release boundary

Android debug 0.8.12/code 23 built, installed over ADB and launched. The package version was verified. The phone's notification shade prevented the initial native UI acceptance check; do not equate installation with verified physical roster refresh. Swift allowlist source was updated, but iOS was not built or uploaded.

APK SHA256: 947a5cd882de93b8c996b5ffd1440f23f72a3012c8777fab7fb95d08a75b3dd9.
