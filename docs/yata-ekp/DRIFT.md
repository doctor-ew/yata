# Scope drift

The user required no phone disruption after the initial launcher patch. The spec now supersedes its unified-manifest proposal with an explicit TV build. Phone manifest/main sources were restored to origin/main. Only opt-in Gradle selection and separate TV files implement the preview. Native UI-mode detection is unnecessary for this explicitly selected artifact. Companion return handling is deferred with a visible unavailable state rather than sharing the phone callback scheme. No other platform or production catalog was changed.
