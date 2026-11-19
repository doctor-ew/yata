# Channel creation repair — 0.8.20

## Failure

The supplied recording shows a request to make a four-show channel receiving conversational advice instead of a saved lineup. Explicit channel-creation wording was not routed to the planner. The buddy button prompted for preferences but retained no pending channel intent, so the next reply also became ordinary chat. Separately, the published catalog supplies 259 eligible shows while the backend planner rejected more than 256.

## Change

A finite command parser routes make/create/build/assemble channel requests to the existing guarded planner. The buddy retains the pending request after asking for preferences. Cancel, feedback, episode search and other explicit commands retain their own paths. Host changes and panel closure clear the pending channel state. This routing uses no show-specific aliases or plot rules.

The service now permits up to 512 offered show descriptors, subject to the unchanged 20,000-character offer field and 32 KiB channel envelope. Other modes retain their existing bounds. Verification, quota controls and finite plan validation remain unchanged. Unknown IDs cannot save a channel.

## Evidence

CloudWatch for the chatbot function from 15:30–16:00 UTC on November 19 contained two completed invocations lasting 4,575.02 ms and 3,242.23 ms, without logged exceptions. Those logs do not include routing mode or HTTP outcomes; the routing diagnosis comes from the recording and source. No raw chat logs or recording footage are committed.

Browser regression covers explicit creation, prompted follow-ups, a 259-show offer, cancellation, feedback precedence and rejection of unknown output IDs. Backend tests cover the 259-show regression, the 512/513 count boundary and unchanged byte caps. These tests use stand-ins for model inference; they do not establish the quality of a paid live model response.
