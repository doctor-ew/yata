# Companion retrieval verification

## Automated checks

The application suite passed 271 tests and repository syntax checks. The retrieval suite passed 24 Python tests, including six CloudFormation bridge tests. The backend suite passed 75 Node tests and 15 deployment tests in normal and optimized Python modes. The scoped adversarial review is [REVIEW.md](REVIEW.md).

## Live service checks

An operator-only signed fixture session invoked the actual chatbot Lambda with its normal authorization counters and moderation. No production verification bypass was added. Three requests returned HTTP 200:

| Request | Outcome | Elapsed |
| --- | --- | --- |
| Gargoyles magical mirror and Puck | The Mirror; sourced TVmaze episode 158103 | 4.66 seconds |
| Invented pineapple-mayor plot | No matching summary; no invented episode | 1.38 seconds |
| Exact words at a scene timestamp | Unsupported scope; no result | 1.22 seconds |

These are focused acceptance checks, not general accuracy or latency benchmarks. The generated reply used the retrieved summary. Existing role, code and environment preimages were checked during the CloudFormation configuration update. The subsequent code-only rollout preserved unrelated package entries. Operational retrieval logs contained only event, status, result count and strategy.

## UI and mobile

Chrome UI testing used an injected response from the live retrieval fixture. It confirmed the raw question is forwarded as retrievalQuery, Dorothy remains selected, the validated TVmaze citation appears, no playback occurs before a click, and the clicked action passes the exact current-catalog show/episode/source identities. This UI check did not exercise real browser verification or stream playback.

Android debug version 0.8.9, code 20, built and installed over ADB successfully. The package version was checked after launch. APK SHA256: b7b56aa14f66185669f0b6db4c35f7804d76b0f1addc934401e12417381f2903.

The full native verified-origin chat interaction and physical iOS playback are not covered by these checks. The native bridge uses the same structured response contract; automated tests cover response validation and legacy compatibility.

A physical Android check then used the installed 0.8.9 APK, its normal verified-origin iframe and the live chat service. C-3PO returned the Mirror answer, validated TVmaze citation and one Play button. Clicking it selected the exact Gargoyles S02E05 Archive source and closed chat. Playback was paused after the check. This verifies native request/response/action integration; it is not an iOS or exhaustive video-decoding test.
