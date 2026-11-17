# Optional Jev integration: scoped adversarial review

Status: APPROVE for the private optional experiment; not approval for public integration or a production-quality relevance claim. No live AWS or model calls were made by this reviewer.

## Scope

Reviewed services/retrieval/jev.py, handler.py, core.py, budget.py, build-retrieval.py, deploy-retrieval.py, the optional CloudFormation secret/policy/environment additions and retrieval tests. The related independent-query evaluation JSON correctly distinguishes whole-corpus Jev experiments from the ten-candidate AWS hybrid path; the reported scores are not an equal-candidate comparison.

## Findings

No unresolved findings in the reviewed scope. The two earlier warnings were repaired:

- services/retrieval/jev.py now requires the complete offered choice-ID set including none, finite probabilities and a total within .001 of one before computing its confidence margin. The sparse/unnormalized-distribution regression passes.
- deploy/retrieval/stack.yaml enforces enabled-implies-nonempty-credential with a CloudFormation rule. The deployment CLI also checks the optional JevCredentialArn output and requires explicit initial configuration rather than reusing an empty parameter.

The state bound now measures UTF-8 bytes. This is specifically a 50,000-byte state bound, not a claim that the entire serialized HTTP body including questions and choices is limited to that size.

## Six-lens findings

DRY and SOLID: no blocking findings; the optional provider is isolated and shares the existing reservation helper. ACID: reservations precede the paid provider call; failures do not trigger a second paid provider or automatic model retries. CoC: the credential and exact-secret search-role read policy are declared in CloudFormation, with retained secret lifecycle. Big O: candidates, state and response reads are bounded. LLM trust: only finite corpus IDs can become candidates, and complete probability-map validation precedes confidence gating. No provider output becomes a launch URL or executable instruction.

## Secret and request boundary

The key is supplied from the local environment as an SDK parameter, not a shell argument. The parameter is NoEcho and the deployment receipt redacts it explicitly. Lambda environment variables contain only the secret ARN. Search alone receives exact-secret GetSecretValue permission; ingestion does not. The provider uses a fixed official HTTPS endpoint, declines redirects, bounds the response and does not retry. Provider failures return unavailable without invoking Bedrock as a second paid fallback.

## Validation and limits

All 18 Python retrieval/deployment/provider tests pass in the dependency-equipped Python environment. The earlier malformed-response reproduction is now covered by a rejecting regression test. No additional paid evaluation was run. CloudFormation validation was reported by the parent agent, not independently repeated by this reviewer.

Official [TypeSafe model documentation](https://docs.typesafe.ai/models) identifies jev-latest as a moving alias and documents the response model field. A cached model label is provenance, not a pin: answers and tuned thresholds can change when the alias moves. Version pinning should precede any stable production-quality claim. That documentation lists input-token pricing and bounded request contexts; the existing one-cent pre-call allowance remains conservative for this experiment, but excludes unrelated AWS/provider-account charges and is not an exact bill ceiling.
