# Buddy watch requests

An explicit watch request updates the viewer’s personal Channel 00 and starts playback. Exact title matches resolve against the checked catalog without an AI request. Broader requests call the channel planner and display its introduction and selected titles in the existing buddy conversation.

The client validates the returned host, title, introduction and show IDs before saving or tuning. An empty or invalid plan leaves the existing channel unchanged. Feedback intake and Konami messages retain their separate handling. The model cannot execute playback operations or publish catalog changes.

## Native verification

Native buddy chat and inline planning use an embedded page hosted at `https://doctorew.com/tv/buddy-service.html`. Turnstile verification, session grants and AI requests remain in that website origin. The native app receives only the answer or plan.

The embedded page accepts one request from its parent window, requires a matching random nonce, and permits only `https://localhost` and `capacitor://localhost` parent origins. Opaque origins are rejected. The native client requires the website origin, the exact iframe window and the same nonce on replies. Cancelling or completing a request removes the frame. Session grants are never placed in messages, storage or URLs.

Android-origin bridge behavior has been tested with simulated service responses. Physical-device verification and iOS verification must be reported separately from browser simulation. The existing verified-web handoff remains available through the standalone channel builder.

## Characters

The roster includes Scooter, Super Friends-era Robin, Master Shake, Orko, Penny, Inspector Gadget and classic Velma. Bundled artwork credits are in `assets/buddy/credits.html`. Character dialogue is original and character-inspired.

## Character and queue commands

“Turn into Twiki” selects and pins that character. “Pin you” keeps the current buddy, and “unpin” or “surprise me on each launch” restores random selection. These commands run locally against the finite roster. The character selector remains available inside the chat settings.

“Play Mork and Mindy next” chooses the first checked episode not already queued or currently playing. If a checked episode is playing, it becomes the queue anchor and the requested episode follows it without restarting the video. “Add Taxi to my queue” appends to Channel 00 without changing the current station. Queue references and character preferences remain local to the browser or app and survive relaunch. No shared catalog is modified.

## Release updates

“What’s new?” and “latest updates” use the latest structured record in `src/release-notes.mjs` as factual context for the selected companion’s existing voice. The reply includes a separate, application-generated link to `CHANGELOG.md` on GitHub. If AI is unavailable, the app displays the release facts directly. Update questions do not alter playback, queues or buddy preferences.

The roster also includes original Strawberry Shortcake, Jem, She-Ra, Kermit, Miss Piggy and Gonzo. “Ms Piggy” and “Kermit” are supported chat aliases.

## Arcade and additional TV voices

Droids-era C-3PO, Kojak and Captain Kangaroo are available as TV companions. Their presence does not add playable show sources. Silver Spoons, The Wonder Years and Captain Kangaroo were absent from the published station catalog when checked for 0.8.4.

Arcade has its own six-character companion pool and game-aware routing; see [ARCADE-BUDDIES.md](ARCADE-BUDDIES.md).
