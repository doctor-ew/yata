# Draft TestFlight review notes

YATA is a retro TV browsing and personal scheduling app. It uses a shared catalog of remote Internet Archive sources and official YouTube playback. The app bundle contains application code, metadata and artwork, rather than episode video files. Source availability and provider restrictions vary. No app account is required for browsing and playback.

Channel 00 can contain a local, explicitly chosen episode queue or an AI-created show mix. Personal lineup preferences and playback bookmarks stay on the device. The optional character-inspired buddy uses a verified web continuation for AI requests. Its response and reviewed lineup can return through the registered `yata://` scheme. Browser verification is not bypassed for native origins.

Anonymous usage counts are enabled by default, with an opt-out in More → Privacy. Browser privacy signals disable collection. Analytics does not contain chat text, contact email, private media URLs or persistent viewer IDs. Optional AI questions are processed separately by the backend and AI provider. See the privacy document for the distinction.

Feedback drafts open a public GitHub issue composer. The viewer reviews and submits the issue using their own GitHub account; the buddy does not post automatically.

The Arcade is an Easter egg: typing “up up down down left right left right b a” into buddy chat unlocks Channel 03. The channel opens the separate public arcade website in the browser. Arcade game assets are not bundled in the TV app. The secret is navigation, not access control. This functionality is disclosed here for review.

Native background/screen-off audio is currently Android-only. The iOS wrapper pauses video when backgrounded. No paid features or in-app purchases are implemented in this project.

Before submission, supply the actual developer contact details, verify build metadata, and replace draft status with the tested native build’s results. This draft is not evidence of Apple approval or distribution rights.
