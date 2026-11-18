# Remote buddy roster: scoped Nightshift review

Status: APPROVE. No unresolved findings in the reviewed scope. This review covers presentation-data delivery and publication; backend voice definitions and analytics collector changes are not included in the implementation scope.

## Reviewed scope

Reviewed src/buddy-registry.mjs, buddy-state.mjs, buddy-ui.mjs, buddy-service.mjs, channel-builder.mjs, channel-builder-ui.mjs, buddy-quips.mjs, analytics.mjs and analytics-hosts.mjs; the exact new native JSON allowlists; build-buddy-feed.mjs and build-static.mjs; buddy-feed-publication.py and the deploy-card-shells.py hook/order. No production or paid-provider call was made by the reviewer.

Read-only validation passed: 26 focused Node tests and 6 Python publication-helper tests. Four of the Python tests were added by this reviewer in services/retrieval/test_buddy_publication.py. The parent added the other two publication-helper tests. These tests use fixtures and malformed-session response stubs; they do not establish live backend voice quality or native device behavior.

## Six lenses

### DRY

No blocking findings. The registry centralizes presentation updates and retained shared-array references. The analytics host list is generated from the collector contract and has a parity test; unknown roster IDs map to none without discarding aggregate events.

### SOLID

No blocking findings. Presentation data does not define backend permissions, model instructions, API credentials or arbitrary playback actions. Backend personalities remain finite and authoritative. Adding a supported frontend profile does not itself provision a backend voice.

### ACID and asynchronous state

No remaining findings. All reported state/refresh warnings were repaired:

- Unchanged selected IDs preserve in-flight channel-builder work and existing plans.
- Current-persona portrait reads remove the roster-listener ordering dependency.
- An authenticated-origin, matching-source/nonce iframe request for a host absent from the website roster receives a one-use nonce-bound roster-refresh error. The native client displays a bounded retry message rather than waiting for its 115-second timeout. The backend remains authoritative; no unknown voice is silently accepted.

Earlier defects were repaired during review: an uncached remote pin now survives temporary bundled startup and restores when its authoritative network profile arrives; native roster requests use the local-relative path so the exact bridge allowlist applies; packaged portraits provide offline fallback; and new portraits finish uploading before the public feed advertises them.

Public cache persistence remains best effort. A new portrait that never existed in the APK may still require connectivity or a retained browser image cache. Removed profiles fall back to an available buddy rather than creating an undefined selection.

### CoC and release safety

No blocking findings. Strict top-level/profile field allowlists reject accidental private prompt or credential fields before the original JSON is uploaded. The build helper treats existing JSON as authoritative and requires explicit bootstrap for a missing feed, avoiding accidental replacement of future data-only profiles with the bundled seed.

Publication validates each profile with the canonical schema, requires its portrait in the release, and checks the guarded backend with a deliberately invalid session. HTTP 401 demonstrates the current finite parsing path accepts the profile before session validation; HTTP 400 or unavailable guards stop publication. This is not a model-response/character-quality test. Portrait uploads precede the feed; code dependencies and HTML follow in reviewed phases. Catalog publication remains separate.

### Big O

No findings. Roster count and serialized payload are bounded; alias uniqueness, fields and quips are bounded; refresh is single-flight. The per-profile backend canary is bounded by the 200-profile roster limit and makes no valid authenticated inference request.

### LLM trust boundary

No blocking findings. Profile IDs equal personality IDs and are finite bounded identifiers. Images stay under the controlled buddy asset path; credits reject executable schemes and URL credentials. Names, traits, greetings and quips render as text. Unknown fields are rejected rather than merely stripped. The feed neither grants model tools nor supplies executable launch URLs. Native changes add one exact public JSON path, not arbitrary fetch capability.

## Verdict and limits

No security blocker was found after the publication/cache/transport repairs. All reported publication, cache, native-transport and UI/iframe findings are repaired. This is not approval of app-store readiness, native attestation, new backend voices, private-provider catalogs or a deployment. Live publication probes, browser/native QA and backend voice checks remain separate evidence. Parent-reported browser checks are not counted as reviewer-executed tests.
