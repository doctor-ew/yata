# Buddy retrieval bridge: scoped adversarial review

Status: APPROVE for the reviewed CloudFormation overlay. This is source approval, not live deployment verification or approval of the pending public query integration.

## Scope

Reviewed deploy/retrieval/buddy-bridge.json and scripts/deploy-buddy-retrieval-bridge.py, including the final independent AWS::IAM::Policy resource and exact unchanged API dependency exceptions. Added six offline fixture tests in services/retrieval/test_buddy_bridge_deploy.py; all pass. No live AWS mutation or credential inspection was performed by the reviewer.

## Findings and repairs

The initial function-template role-reference gap is repaired. The overlay requires the exact reviewed GetAtt role shape, compares the live role before preparation, and verifies it is preserved afterward.

The final template patch changes only the chatbot environment and adds the independent exact-target invocation policy. It preserves all existing role policies and function code properties. Scope validation permits only the reviewed function/policy changes and two exact unchanged API method/permission dependency resources. Those dependency changes must preserve the template resource, match expected types, use Modify and have only False or Conditional replacement. Stable function naming preserves the target ARN; no new public route is introduced by this overlay.

## Six lenses

- DRY: no findings; one template patch defines the narrow overlay.
- SOLID: template preparation is testable separately from control-plane deployment.
- ACID: code/configuration revision drift is checked before execution; completion is tied to the exact executed change set. Final code, role and environment checks detect unexpected changes. CloudFormation owns rollback/resource lifecycle. This does not promise atomic public request behavior during the configuration update.
- CoC: all new IAM configuration remains in version-controlled IaC; no untracked role-policy mutation is used.
- Big O: bounded stack/template operations; no unbounded data-plane retrieval.
- LLM trust boundary: the overlay handles no prompt/model output. Legacy template secret values remain in memory; receipts include hashes and resource identities, not templates or environment values.

## Explicit tradeoff

The existing Serverless execution role is shared. Every function using that role inherits the exact search-function invocation permission, although only the chatbot environment receives the retrieval target. The grant is not chatbot-principal-exclusive. It grants no ingestion invocation, corpus/vector write or secret access. A separate chatbot execution role would require a distinct reviewed migration.

## Tests and remaining acceptance checks

The six tests cover exact mutation scope, original input preservation, idempotence, existing policy conflicts, unexpected named resources, known region-based role naming and foreign template role references. They do not execute a CloudFormation change set or validate live IAM/API behavior. The parent's reviewed plan and subsequent live code/configuration/permission checks remain deployment acceptance evidence.

## Public buddy backend adapter: follow-up review

Status: APPROVE for the reviewed backend source. The CloudFormation-overlay approval above remains separately scoped.

Reviewed the backend worktree changes in src/episodeRetrieval.ts, src/handler.ts, src/buddySafety.ts, src/security.ts and scripts/deploy-episode-retrieval.py. The finite retrieval adapter, guard parsing, request equality and archive-patching tests were read. Read-only validation passed: 12 focused Node tests (retrieval and buddy safety) and 2 Python archive-boundary tests. This does not establish full live verified-chat behavior.

No unresolved findings in the reviewed backend source. Both earlier warnings were repaired:

- safeBuddyReply invokes an explicit rejection callback for injection/input/output rejection, and the handler clears its structured retrieval envelope. The output-rejection regression passes.
- Retrieval requests now have an absolute 25-second application budget established at handler entry, capped by Lambda remaining time minus response reserve. Authorization time is included. Each moderation call is clipped to available time; retrieval preserves time for commentary/output checks; commentary preserves output-moderation/response time. If the remaining budget is insufficient, the code avoids the next paid operation or returns a bounded failure. Ordinary non-retrieval chat retains its previous behavior.

Actual API Gateway latency/cold-start behavior remains live acceptance work. The source review does not claim every pre-existing chat path meets the retrieval-specific deadline, or that an aborted synchronous Lambda invocation cancels work already executing in the invoked search function.

No arbitrary URL invocation or raw-query/secret logging was found. Input moderation precedes retrieval, retrievalQuery must exactly equal the moderated question, retrieval failures do not trigger a second retrieval provider, and returned finite identities/provenance are validated. The bounded evidence payload is explicitly marked untrusted; nevertheless, prompting is not a proof against factual hallucination. Playback decisions remain outside model output.

Compatibility note: the backend adapter accepts a narrower identity alphabet than the private corpus contract. All 86 currently inspected pilot records satisfy it, so no current-corpus failure was found. Broader future corpora must preserve or reconcile that contract before publication.
