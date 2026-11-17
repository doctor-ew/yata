# Arcade expansion installation

## Result

Fourteen requested variants are installed locally. Two later crossover titles remain unavailable because the current browser emulator has no Dreamcast/NAOMI runtime. See arcade/README.md for the exact variants and reproduction command.

## Evidence

- All source downloads were checked against Internet Archive file size and MD5 metadata; SHA-256 pins were recorded for reproduction.
- Runtime files were downloaded from the pinned EmulatorJS 4.2.3 CDN and SHA-256 recorded.
- Each of fourteen entries produced a visible emulator canvas and rendered original game output in local Chromium.
- Representative coin/start and action buttons were instrumented against the running emulator. Street Fighter II showed inserted credits; X-Men progressed through its rendered intro. Fighter decks expose six actions. These checks do not certify full gameplay or multiplayer.
- Local audit screenshots and JSON receipts: /Users/drew.schillinger/Projects/yata-audits/arcade-expansion.
- The complete static arcade release builds with the new modules, runtime files and game formats.

## Boundaries

Game binaries remain ignored locally. No new game binaries were uploaded to GitHub or the public web host. Availability in an archive is not proof of redistribution permission. The public site and native app continue to use the previously deployed hosted catalog until a separate publication.
