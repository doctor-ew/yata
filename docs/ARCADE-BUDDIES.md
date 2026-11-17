# Arcade companions and game routing

Arcade uses Pac-Man, Donkey Kong, Q*bert, Frogger, Mario and Sonic as its game-focused companion pool. Its pinned character, random selection and visibility use a separate local preference from the TV companion. A Buddy control inside the game cabinet opens the chat while a game is loaded.

## Play requests

The application resolves game names against `src/arcade-games.mjs` and TV names against the checked station catalog. A title present in both catalogs produces a Watch/Play choice. Multiple game editions produce a version choice. Explicit game requests do not fall through to the TV channel builder. Games marked unavailable cannot launch.

On TV, a locked game request retains only its catalog ID in memory. Entering a valid Konami sequence unlocks the Arcade and launches that game once. Invalid sequences do not launch it. Cancel, closing chat, choosing a different target or reloading clears the pending target. An unlocked request opens the selected game directly. Launching a game pauses the TV and checkpoints its position; the unlock prompt alone does not interrupt playback. The secret entrance remains a navigation Easter egg, not an access-control boundary.

A game-specific URL selects an installed catalog game on the Arcade launcher. Unknown IDs cannot become arbitrary frames or network destinations. Failed launches retain the machine’s retry control. No game queue is added: game requests containing “next” ask the viewer to launch a game now instead of editing the TV episode queue.

## Catalog and AI boundary

Run `node scripts/build-game-index.mjs` after changing the Arcade source catalogs. The generated index contains names, installed status and documented hints, without game binaries or launch URLs. The launcher resolves the actual game from its existing catalogs. Ordinary shelf loading continues to keep Flash on its optional shelf.

Arcade chat supplies documented game controls and mod hints to the selected character’s existing moderated chat service. Replies cannot execute actions, invent launch destinations or change the TV queue. The application handles explicit play commands locally. “What’s new?” uses the same structured release notes as TV.

Only the Arcade launcher’s content policy permits the existing AI and Turnstile hosts. Embedded game pages retain their existing self-only network policy. Shell-only deployment changes launcher files without republishing game assets.

## Verification

Automated coverage includes locked launch, invalid code, one-time successful launch, cancel/close, unavailable games, edition and TV/game ambiguity, independent buddy pins, and unchanged TV queue behavior. Browser routing checks load the real local cartridge bytes with a fixture player; they do not establish full emulator gameplay or compatibility for every title. Physical Android launch verification is reported separately from browser checks.
