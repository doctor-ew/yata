# Buddy roster additions

Date: 2026-11-18

## Published data

Added Junior Wetworth, Brainy Smurf and original Police Squad-era Frank Drebin to the public companion feed. The roster contains 51 profiles, including six eligible Arcade companions. The bundled offline fallback remains unchanged; Android 0.8.12 downloads the additions without an APK update.

Portrait provenance is recorded in assets/buddy/credits.html. Brainy's image is a frame from the original cartoon at 2:00 in S05E24, Brainy Smurf, Friend to All the Animals. No generated imagery was used.

## Validation

- 287 frontend tests passed.
- Backend security suite: 76 Node tests and 15 Python deployment tests in each normal and optimized execution passed.
- Backend publication replaced only the compiled channel planner and personality matrix. Existing guard and retrieval code remained unchanged.
- Publication accepted all 51 backend personality identities before uploading the public roster and images.
- The connected Android 0.8.12 application downloaded 51 profiles and displayed 51 selector entries. The local command Turn into Wetworth selected Junior Wetworth; the pin survived reload.
- The public feed returned 51 profiles after deployment.

Actual generated dialogue was not exercised in this acceptance check. Backend identity canaries verify admission and invalid-session denial, without paid inference.
