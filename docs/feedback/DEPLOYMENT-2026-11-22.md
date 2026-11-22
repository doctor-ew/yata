# November 22 web feedback deployment

Status: deployed to https://doctorew.com/tv/ on November 22, 2026. [Sanitized deployment receipt](DEPLOYMENT-2026-11-22.json).

## Published behavior

Requests & bugs starts conversational report intake. Jev selects a category and missing-detail label; the client keeps the viewer’s wording and presents a targeted question or draft review. Repeated questions and service failures retain the report with a form fallback. Review on GitHub opens a public draft and does not claim delivery.

The web deployment also includes the reviewed source for unmatched channel-request explanations, acceptance before planner-generated lineups are saved, up to 50 named local lineup presets, and the fullscreen playback drawer. The website retains version 0.8.22 with dated November 22 web release notes. Existing Android and Apple packages were not released, rebuilt or installed in this deployment task.

Source revisions:

- Implementation: `495f39b8aa32658fd16a3754338cff613923a940`.
- Dated web release: `c0858f871c7fb0fd40287363d682d0825c2cad1e`.
- Live-smoke correction: `7918a85e0d1fde266ee2917a4c30616f28192cea`.

## Rollout and preservation

The private service was updated first through CloudFormation. Its change set modified only the existing Ingest and Search function code, without replacement. Existing Jev configuration and daily/monthly allowance settings were carried forward unchanged.

The public API’s handler and security module matched the pinned source before patching. The patched archive changes those two modules and adds the bundled feedback assessment module; every unrelated archive entry was preserved. Before deployment, the CloudFormation package reference was aligned with the actual running preimage so automatic rollback would restore the correct package. The subsequent change set updated the existing chatbot code. CloudFormation reevaluated the unchanged API method and invocation permission through the same function ARN; their template definitions were unchanged. Pre-deployment validation returned no failed events, both updates completed, and deployed package hashes matched.

The website publication used conditional object writes, private preimages and S3 versioning. Eighteen changed code/style/HTML objects were published in dependency order. The verification usability correction changed only the companion UI module in a separate follow-up receipt. Both CloudFront invalidations completed. Final public reads matched all 18 expected file hashes.

No catalog, artwork or other data feed was uploaded. Both published catalog manifests retained their exact hashes, revisions and S3 versions. No new inference permission, public service endpoint or issue-posting credential was introduced. Private rollback packages, templates, artifact references and object-version records remain outside the public repository. The public receipt contains only source revisions and public verification results.

## Observed verification

- 316 client unit tests and syntax checks passed; the final local companion browser regression passed.
- Public API canaries returned HTTP 401 for invalid feedback and legacy buddy sessions, and HTTP 400 for a malformed report. These denial checks did not invoke inference.
- Five IAM-authorized live Jev assessments used synthetic reports. A complete bug and a completed follow-up returned ready; an explicit bug missing its outcome returned actual with confidence 0.88; two ambiguous reports returned clarify. These are targeted observations, not a broad model benchmark.
- The initial automated live browser reached the report input without page errors but did not finish browser verification before the original 20-second timeout. Its report text remained available through the form fallback. The live-smoke correction extends the feedback deadline to 120 seconds, scrolls inserted verification UI into view and clears stale fallback status. Its source passed the full unit suite and local browser regression and its public bytes were verified.
- The regular browser access host was unavailable for a further interactive pass. A real viewer’s completed browser-verification-to-assessment exchange remains unverified. No public GitHub issue was posted by these tests.

## Rollback

Private deployment records retain the actual previous service packages and website object versions. An authorized rollback must first confirm that the current objects belong to this release, then restore only its publication scope and preserve all other live settings. The public API rollback reference was aligned with the actual running preimage before the update. Infrastructure coordinates and private rollback records are not published here.

Issue 57 remains open for interactive browser acceptance. PR 59 and the dependent source PRs remain unmerged; deployment does not imply review or merge completion.
