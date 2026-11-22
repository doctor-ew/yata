# Semantic feedback intake

Status: implemented in source; not deployed. This supersedes the form-first feedback behavior prepared in PR 58. Issue: https://github.com/doctor-ew/yata/issues/57.

## Viewer flow

Requests & bugs focuses the companion’s Your report input. The viewer describes the problem or desired change. The application retains that wording and asks the assessment service which detail is missing. A complete report goes directly to review. A missing detail produces one application-owned question. Repeated requests for the same detail stop the questioning and offer an editable form.

The form remains optional through Use a form. Report text survives assessment failures, malformed responses and form close/reopen. Existing form edits survive reopening with the same report. Cancel stops in-flight assessment; late results cannot reopen the report. Companion changes and panel closure end conversational intake.

Review on GitHub opens a public draft; it does not post an issue. The viewer must review and submit on GitHub. Browser-opening failures retain the draft for retry. The app distinguishes an opened draft from delivery and does not claim Drew received it. No issue-posting credential or new submission endpoint is introduced.

## Contract

The proposed public extension uses the existing POST /chatbot route with mode feedback, an existing approved personality, a question string containing the JSON FeedbackReport, and the existing verification token. The OpenAPI contract is services/buddy-feedback/openapi.json. Existing origin, verification, moderation, replay and quota controls remain in place.

FeedbackReport contains version 1 and 1–6 viewer messages. Each message contains text and answerTo, either null or one of description, action, actual and desired. Text is limited to 1,000 UTF-16 code units per message and 2,400 total. The serialized question is limited to 4,000 code units and 12,000 UTF-8 bytes. General companion conversation, playback history, credentials and application storage are not added to this context. Long reports move to the editable form instead of being silently truncated.

The IAM-only private service receives operation feedback and report. Jev returns two complete choice distributions: category and next step. Category is bug, feature, channel, content or other. Next step is description, action, actual, desired, ready or clarify. Accepted choices require finite normalized probabilities, winning probability and confidence at least 0.85, and a margin of at least 0.5. Uncertainty and service failures produce a finite fallback. The model cannot provide report prose, a URL, tool arguments or a delivery claim.

The private response is version, status, kind, next and confidence. Status is assessed, clarify or unavailable. Client, public adapter and private service validate the envelope. The user-authored first message supplies the initial summary; retained messages and application question labels supply the details. The viewer can edit all fields before opening the draft.

Assessment uses the existing Jev provider adapter, allowance reservation and disabled-provider behavior. There is one provider attempt per assessment, with no alternate provider or automatic retry. Feedback text and assessments are not written to the retrieval cache. Provider-side retention is outside this implementation. Public diagnostics log only the assessment status and next-step label.

## Source ownership and build

The private service is implemented in services/retrieval/feedback.py and included by scripts/build-retrieval.py. No credentials enter the browser or repository.

The guarded public API still belongs to the shared backend. YATA owns services/buddy-feedback/feedbackAssessment.ts and guarded-api.patch. The overlay is pinned to shared-backend revision a8118ff7ebe259fe515f6a8e003dd5c03ec68c00, recorded in upstream.json. No changes are published to that upstream repository.

The local validation used this command to prepare a separate build directory from the pinned checkout:

```sh
node scripts/prepare-feedback-backend.mjs --backend /tmp/yata-feedback-backend --out /tmp/yata-feedback-overlay
cd /tmp/yata-feedback-overlay
npm ci
npm run test:security
```

Those temporary directories already exist after this run; use a new output directory for a repeat build. The script checks the revision, clones only committed source, checks and applies the patch, and copies the YATA module and tests. It does not deploy or modify the source checkout.

## Deployment boundary

Deployment remains a separate action. Update the private service and guarded public API before publishing the web client and verified-origin iframe. The native client needs a new package for its new mode; existing packages continue using their existing flow. A new client facing an older public service falls back to the form.

Use the existing reviewed deployment workflows, retain unrelated package entries and resource configuration, and verify actual deployed bytes and session-denial canaries. Do not widen IAM or publish an unauthenticated endpoint. Do not republish the catalog. Native transport preserves the existing frame source, website origin and nonce checks; session grants stay inside the verified website frame.

Live Jev behavior on the screenshot report, production verification and physical-device acceptance remain release checks. Local distributions and HTTP stand-ins establish client/contract behavior, not model accuracy.

## Local verification — November 22, 2026

- Client: 316 Node tests, syntax checks, existing companion/channel-builder browser regressions and the semantic feedback browser regression passed.
- Guarded public API overlay: 83 Node tests passed; 15 deployment tests passed in each of normal and optimized Python. Handler tests verify authorization and moderation precede assessment, and injection attempts do not call the assessor.
- Private service: 49 tests passed in each of normal and optimized Python, including finite distributions, input limits, allowance denial, no cache/corpus access and provider failure.
- Native iframe: intent and feedback requests traversed the actual website frame protocol with HTTP/verification stand-ins; no session grant appeared in parent messages and frames were removed on completion.
- Local Postman HTTP simulation: session and assessment requests were observed. Browser cases cover the screenshot report, one targeted question, repeated-question prevention, complete-report review, retained form edits, invalid output, HTTP 503, unavailable results, browser-opening failure and cancellation of a delayed response. Synthetic GitHub pages intercepted draft navigation; no public issue was posted by the tests.
- Android debug package built successfully. The package was not installed for this task. The private Lambda package includes feedback.py and handler.py and built with pinned dependencies; artifact SHA-256 is `6afece3a95e5aab01b1e0f0229c3d133f164770fda4a450eeebeb629969a62d3`.

The simulation is postman/simulations/yata-feedback/yata-feedback.sim.yaml. Its context records the synthetic assumptions and unresolved provider-quality check. Run it locally, then set YATA_FEEDBACK_SIM_URL to its buddy route when running test/browser-feedback-intake.mjs. No Postman cloud deployment was performed. The installed CLI is 1.75.0; its status command is unavailable.
