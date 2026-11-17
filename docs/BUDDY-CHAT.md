# Buddy watch requests

An explicit watch request updates the viewer’s personal Channel 00 and starts playback. Exact title matches resolve against the checked catalog without an AI request. Broader requests call the channel planner and display its introduction and selected titles in the existing buddy conversation.

The client validates the returned host, title, introduction and show IDs before saving or tuning. An empty or invalid plan leaves the existing channel unchanged. Feedback intake and Konami messages retain their separate handling. The model cannot execute playback operations or publish catalog changes.

## Native verification

Native buddy chat and inline planning use an embedded page hosted at `https://doctorew.com/tv/buddy-service.html`. Turnstile verification, session grants and AI requests remain in that website origin. The native app receives only the answer or plan.

The embedded page accepts one request from its parent window, requires a matching random nonce, and permits only `https://localhost` and `capacitor://localhost` parent origins. Opaque origins are rejected. The native client requires the website origin, the exact iframe window and the same nonce on replies. Cancelling or completing a request removes the frame. Session grants are never placed in messages, storage or URLs.

Android-origin bridge behavior has been tested with simulated service responses. Physical-device verification and iOS verification must be reported separately from browser simulation. The existing verified-web handoff remains available through the standalone channel builder.

## Characters

The roster includes Scooter, Super Friends-era Robin, Master Shake, Orko, Penny, Inspector Gadget and classic Velma. Bundled artwork credits are in `assets/buddy/credits.html`. Character dialogue is original and character-inspired.
