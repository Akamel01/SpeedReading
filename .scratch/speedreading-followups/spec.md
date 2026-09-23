# Spec — speedreading-mvp follow-ups

## Objective

Close the known MVP limitations (`.autoforge/state.json` → `known_limitations`, app review, investigation) without changing the shipped architecture (ADR-1 no-build vanilla, ADR-10 local-only, ADR-8/9 chunk and adaptation policy).

## Scope (in)

- Chapter navigation across multi-chapter texts (01)
- Quiz authoring mode separate from the assessment flow (02)
- Unit-testable WPM active-time computation (03)
- Quiz-quality regression lock-in on real prose (04)
- Browser coverage for export/import round-trip (05)
- Manual screen-reader + keyboard-only verification (06)
- IndexedDB failure-path hardening (07)
- Large-book performance measurement (08)
- Paste-to-import text entry (09)
- Evidence-gated perceptual-span training drills (10)

## Scope (out)

- Bundler/framework migration (contradicts ADR-1)
- Accounts, cloud sync, telemetry (contradicts ADR-10)
- PDF/DRM import, LLM quiz generation (grilling non-goals)
- Mobile apps, social features

## Acceptance

- `node --test` stays green; `.autoforge/validation/e2e-walkthrough.mjs` stays green
- Each ticket's own acceptance criteria (in its file) verified with quoted evidence
- No ADR contradiction without an explicit, logged decision
