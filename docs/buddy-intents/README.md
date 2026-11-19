# Typed companion intent routing

## Contract and authority

The verified POST /chatbot contract accepts mode `intent`, a finite approved `personality`, and a raw `question` of 1–1,000 characters / at most 4,000 UTF-8 bytes. Existing session verification, moderation, replay and usage controls apply. Other operation fields are rejected. The response is `route`: version 1, status (`classified`, `clarify`, `unavailable`), an allowed intent and a finite confidence between zero and one. No generated entities, URLs, IDs or tool arguments are accepted.

Allowed intents are conversation, build-channel, episode-search, queue-next, queue-end, launch-game, feedback, companion and clarify. Both the backend adapter and client validate the envelope. A classified response needs confidence at least 0.85. The private service additionally requires complete normalized probabilities, winning probability at least 0.85 and a margin at least 0.5. Uncertainty or provider failure asks for clarification; it cannot guess an action.

## Flow

Unambiguous existing commands retain their fast paths. Other messages invoke the semantic router before ordinary chat. A channel intent calls the existing finite catalog planner with the original request. Queue and game choices resolve against the current catalog; locked games retain their Konami gate. Episode questions use sourced retrieval; unsupported quotes or timestamps retain their limitations. Feedback remains a reviewed public issue draft. Changing companions requires a finite approved profile.

The client performs the action and reports success only after saving. A language model cannot publish content, execute code, mint a source URL or grant permissions. Prompted channel preferences remain local state; cancellation, panel closure and host changes clear them.

## Infrastructure and budget

The existing guarded chatbot Lambda invokes the existing IAM-only search Lambda with the exact private operation `{operation:"intent",query}`. The private search service uses its existing Jev secret, on-demand allowance table and 24-hour cache. It does not read the episode corpus or call embeddings for intent routing. No new public endpoint, resource, IAM grant or always-on worker is added. Lambda artifact updates use the existing CloudFormation stack. Backend package updates preserve unrelated package entries and use optimistic revisions and verification-denial canaries.

Intent attempts share the existing conservative one-cent reservation and monthly/daily caps. Cached decisions avoid repeated provider work. There are no provider retries or automatic second-model fallback. Routing adds a request and provider latency for messages that need semantic classification. AI attempt/success analytics count classifier and follow-on generation as separate requests; no per-message deduplication is claimed. Budget unavailability produces clarification choices; it does not widen quotas.

## Native transport and observability

Native requests use the same verified-origin iframe, nonce and origin checks. The bridge accepts the finite intent mode and returns only the typed result; session grants remain inside the verified frame. The backend logs event, intent and status, without query text, prompts, grants or credentials.

Non-versioned JavaScript, CSS and HTML are published with revalidation headers; an already running page still needs reload to execute new modules. The visible header/About version identifies loaded interface code. Remote catalog and roster revisions are independent. New routing UI or native bridge behavior requires a new package; approved presentation-data changes alone can refresh remotely.

## Verification

The adjacent acceptance report records actual IAM-authorized private Lambda calls. All eight cases classified as expected: the supplied Let's-create request, watch/make/put-together variants, a conversational app question, queue-next, episode search and an injection attempt requiring clarification. These are targeted acceptance examples, not a comprehensive intent benchmark.

Local tests cover complete finite distributions, thresholds, unknown operations, cache behavior, spending denial, service failure, strict API fields and session denial. Browser checks exercise explicit and semantic creation, pending preferences, uncertainty, unavailable catalog, feedback/cancel precedence, unknown IDs, alphabetical companion search, and the actual native iframe wire with HTTP/verification stand-ins. Those bridge checks do not claim a live Cloudflare or paid generation session.

The companion roster includes Krystal and original Boss Hogg with sourced original imagery and approved backend identities. Selection filtering sorts display names and searches names/aliases. A generated 4:3 video fixture confirms contained playback and a cabinet-safe inset on desktop and phone layouts. Source-encoded cropping cannot be recovered by CSS.

## Release evidence

The private service passed43 Python tests in normal and optimized modes. The guarded backend passed79 Node tests plus15 deployment tests in each Python mode. The client passed299 Node tests and syntax checks. Browser regressions cover channel creation, native iframe transport, companion filtering/selection, displayed version and desktop/phone video containment. The public intent route rejects an invalid session with HTTP401; approved profile canaries reached session denial for all56 profiles without invoking paid models. Deployed backend module bytes match the local compiled artifacts. A physical Android check read v0.8.21 before ADB disconnected; it did not complete a live companion exchange.
