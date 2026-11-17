# Companion episode retrieval

## Request flow

TV plot and episode questions use the existing verified buddy session. The client submits its bounded raw question as both `question` and `retrievalQuery`. The chat service validates that equality, authorizes the session and applies its existing usage limits. Injection checks and input moderation run before retrieval.

The chat Lambda invokes the private search Lambda using its execution role. Search uses the bounded Jev strategy and the existing reservation/cache controls. Validated whole-episode summary evidence becomes a literal system message for the character reply. Provider text cannot supply tools, media URLs or playback instructions. Unsupported dialogue/timestamp questions and unavailable or empty retrieval return a limitation without unsupported answer generation.

The response includes the character reply and bounded retrieval metadata. The client accepts only validated TVmaze episode citation URLs. It resolves exact show, episode and source identities against its current catalog before rendering a playable result and again when the viewer presses Play. Retrieval does not start playback automatically. Native requests use the existing verified-origin iframe and preserve the structured response.

## Coverage and limits

The initial corpus contains 86 summaries: 74 Gargoyles and 12 Street Hawk. This is summary search, not transcript, script, exact quotation, current-screen or scene-timestamp search. Summaries may contain whole-episode spoilers. The retrieval service can return candidate matches rather than a proven answer. The client does not accept new playback URLs from model output.

The interface currently routes explicit episode/story/plot questions of at most 300 characters to retrieval. Existing direct watch, queue, game, character, update and feedback commands retain their own paths. Conversational memory and follow-up pronoun resolution are not supplied by this change.

## Infrastructure and access

The private search stack remains IAM-only. No new public endpoint or function URL is added. The existing chatbot route provides the guarded public entry point.

The declarative bridge configuration is [buddy-bridge.json](../../deploy/retrieval/buddy-bridge.json). [The deployment script](../../scripts/deploy-buddy-retrieval-bridge.py) applies a narrow CloudFormation overlay to the existing backend stack, preserving its legacy template in memory only. It adds an independent exact-function invoke policy and the chatbot environment reference. Unchanged API method/permission dependencies may be reported by CloudFormation because they reference the named function; the script permits only those exact unchanged resources and verifies that code and role remain unchanged.

The existing Serverless execution role is shared by the backend functions. Consequently, the exact retrieval invocation permission is inherited by those functions, although the application calls retrieval only from guarded buddy requests. Splitting execution roles remains a hardening follow-up; this release does not claim chatbot-exclusive IAM access. The backend Serverless source also declares the environment value and invoke permission for future full deployments.

## Cost and privacy

Search retains the pilot's conservative $3 monthly pre-call reservation allowance, cached results, bounded input/output and disabled provider retries. This is an application control rather than an exact AWS bill cap. Generation/moderation remain subject to the existing chat-service limits. Search failure does not trigger a second paid search provider.

Operational retrieval logs record status, result count and search strategy. They do not record query text, excerpts, session grants or credentials. Standard Lambda request identifiers and durations support incident investigation. Source attribution and evidence limitations remain visible with results.
