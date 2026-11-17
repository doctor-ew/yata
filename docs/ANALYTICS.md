# Anonymous usage analytics

## Access

The private owner dashboard is [YATA Usage in AWS CloudWatch](https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards/dashboard/YATA-Usage). AWS sign-in and dashboard/log-query permissions are required. The public app cannot read the dashboard or logs.

## Metrics

| Event | Definition |
| --- | --- |
| App open | A page or app webview loads with collection enabled. Reloads count again; this is not unique people. |
| Play start | A selected source reaches confirmed foreground playback for the first time in that playback attempt. |
| Watch seconds | Foreground position advance bounded by elapsed time. Pauses, buffering, seek jumps, hidden views and long suspended timer gaps are excluded. |
| Playback error | At most one reported failure per attempted source, including autoplay failures. |
| AI attempt/success/failure/cancel | A channel-builder or buddy request begins and returns, fails or is cancelled. Success does not measure answer quality. Verification failures are request failures. |
| AI handoff | Android opens the verified web AI flow. This is separate from the eventual request and must not be added to request counts. |
| Feedback draft | A reviewed draft is opened on GitHub. It is not proof that an issue was submitted. |
| Arcade unlock | The current session unlocks Channel 03. |

Channel dimensions distinguish the tuned channel from Library, Movies, and custom lineups. No show or episode identifiers are collected. Android screen-off native audio is excluded from this initial watch-time measurement. Browser suspension, offline use, blockers, opt-out and dropped batches cause undercounting. Client events can be spoofed; these are product usage estimates, not audited audience figures.

## Privacy and controls

Only predefined event names, channel categories, platform, provider, buddy host, application version and bounded numeric values are accepted. No chat text, contact email, private URL, source URL, referrer, persistent viewer identifier or user-agent field is sent. The collector does not log request bodies or headers. Infrastructure access/security logs, if independently configured, are outside this usage dataset.

An anonymous usage switch is available in television setup on web and Privacy under More on Android. Disabling it clears the pending in-memory queue and suppresses future events. Global Privacy Control and Do Not Track signals disable collection and cannot be overridden by the app switch. The opt-out preference is local to each browser or app installation.

Batches remain in memory and are dropped on delivery failure; there is no persistent offline queue. A random, short-lived batch identifier supports duplicate rejection, not viewer recognition. The rate limiter uses an hourly rotating keyed IP hash solely in the existing guard table, with a two-hour expiration timestamp. Batch receipts expire after one hour and the global daily counter after two days. DynamoDB TTL deletion is asynchronous. None of those throttle keys enter event logs.

Event log retention is configured to 30 days. The dashboard queries the last seven days by default; refresh runs Logs Insights queries. AWS log ingestion, retention, API requests and queries may incur usage charges. The implementation does not create per-channel custom CloudWatch metrics.

## Deployment and verification

`services/analytics/handler.py` defines the bounded collector contract. `scripts/deploy-analytics.py` deploys the dedicated Lambda, restricted execution role, analytics-only API route/throttle, log retention and private dashboard. The AI routes retain their Turnstile and CORS requirements. Native analytics origins are allowed only on the analytics route.

The collector uses a five-request-per-second API throttle with burst ten, reserved Lambda concurrency two, a 600-batch hourly keyed-IP quota and a 100,000-batch daily global quota. It rejects extra fields, arbitrary dimensions and inflated counts before event logging. Duplicate batches are rejected through a transactional guard receipt. Synthetic verification uses version `0.0.0`, excluded from dashboard queries.

Tests cover opt-out/privacy signals, payload allowlisting, dropped offline batches, watch timing through seeks/pauses/hidden views, collector validation and rate-limit failures. Live smoke tests must confirm accepted safe events and rejected extra fields. Device-level screen-off analytics is not claimed.
