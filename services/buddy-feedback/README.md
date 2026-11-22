# YATA guarded feedback adapter

This directory owns the feedback assessment extension to the existing shared API. The pinned upstream repository and revision are in upstream.json. Apply guarded-api.patch only to that revision and compile feedbackAssessment.ts alongside the existing source. scripts/prepare-feedback-backend.mjs reproduces that preparation in a new output directory without changing the source checkout or publishing upstream.

openapi.json describes the proposed feedback mode. feedback.test.cjs is copied into the prepared backend test suite. Existing verification, origin, moderation, session, quota and provider boundaries stay active. The module selects no generated URLs or issue text and cannot post a report.

See docs/feedback/SEMANTIC-INTAKE.md for client behavior, constraints and rollout order. This source overlay is not a deployed API.
