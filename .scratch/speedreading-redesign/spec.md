# Spec — speedreading-redesign

## Objective

Reshape the trainer's UI/UX with a distinctive, Apple-grade, impeccable visual world, then land it through architecture review into traceable implementation tickets.

## Scope (in)

- 3 passes × (frontend-design → apple-design → impeccable): diverge, challenge, converge
- Architecture deepening review of the redesign's code impact
- Implementation tickets with dependency matrix covering the final spec

## Scope (out)

- Behavior changes beyond what the redesign requires (RSVP engine, quiz logic, storage stay as-is unless the spec demands otherwise)
- Backend, accounts, telemetry (ADR-10 holds)
- New import formats

## Acceptance

- Each pass writes its artifact under `design/`; final spec is buildable (tokens, type scale, motion values, copy)
- Architecture report + grilled deepening choice recorded
- Implementation tickets published with dependency matrix; unit + e2e suites stay green through the build
