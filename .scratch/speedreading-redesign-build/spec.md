# Spec — speedreading-redesign-build

## Objective

Land the frozen redesign (`.scratch/speedreading-redesign/design/pass-3-*.md`, `tokens.md`, `architecture.md`) on the live app without behavior regressions.

## Scope (in)

- Foundation: pure sentence/tick mapping + tests (B1), `h()` DOM helper + tests (B2), tokens.css split (B3)
- Surfaces in chain order: header/nav (S1), shelf (S2), page + rail + setup block (S3), quiz copy (S4), log lap rows (S5), motion + responsive (S6), final green + e2e (S7)

## Scope (out)

- RSVP engine, quiz/scoring logic, storage, import formats (untouched unless the spec demands)
- Player-view split, settings module, router module (rejected as hypothetical seams in architecture.md)
- Backend/accounts/telemetry (ADR-10 holds)

## Acceptance

- Tokens, type scale, materials, copy, motion values, fallbacks match the frozen spec exactly
- `node --test` green at every slice; e2e walkthrough green at S7; live site redeploys from `main`
