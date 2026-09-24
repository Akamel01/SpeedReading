# Map — speedreading-product

**Label:** wayfinder:map
**Upstream:** user mission 2026-09-23 (digest in `spec.md`). Prior efforts: `.scratch/speedreading-redesign/` (folio world, shipped), `.scratch/speedreading-gamify/` (execution wave 1), `.scratch/speedreading-followups/`, `.scratch/speedreading-deploy-imports/`.

## Destination

The transformed SpeedReading product: premium learning-app UX with deep, honest gamification, on the existing vanilla no-build architecture, with versioned persistence and verified a11y/responsive/perf. `spec.md` §Acceptance (mission §31) is the bar. The route is clear when every decision ticket is closed and the autoforge execution waves have landed with validation evidence.

## Notes

- **Execution is carried in-map.** This map holds decision tickets that gate waves; the autoforge pipeline (discover → grill → architect → plan → critique → execute → review → validate) runs each resolved route. Run: `speedreading-003`.
- **Skills:** impeccable (craft floor; its scripts/references are absent locally — inline rules only, same as the redesign run), frontend-design, taste (direction decided first), apple-design, accessibility, tdd, verify-and-stop.
- **Incumbent world:** folio/ink/marker (ADR-19, live at akamel01.github.io/SpeedReading). Default posture: preserve + expand into a full material/state/motion system. Replacement only if ticket 01's prototype proves it wrong. Per impeccable: refinement preserves, redesign replaces — this effort is a product redesign inside the incumbent world.
- **Stack truth:** no React, no deps, no build. Mission's React mentions are boilerplate; the principles (events → engine → state → UI; no reward logic in views) apply to vanilla modules.
- **Prototype tickets batch into one review checkpoint** (01, 05, 06) so the human reacts once, not three times.
- **Gamification execution wave 1** lives in `.scratch/speedreading-gamify/issues/` (01 xp, 02 streak, 03 achievements, 04 cards, 05 viz, 06 integration, 07 gate). It predates this map and is adopted by it.
- Tracker: local markdown (`docs/agents/issue-tracker.md`). Ticket files under `issues/`, status via `Status:` line.

## Decisions so far

<!-- index: one line per closed ticket -->

## Not yet specified (fog)

- Component-level specs for library/player/quiz/dashboard after tickets 01–07 resolve
- Migration of existing `schemaVersion:1` exports into the v2 profile (graduates from 03)
- Wave sequencing + human checkpoints (graduates from 02/08)
- Visual-regression tooling choice for a no-build repo (graduates from 08)
- Multi-user/cloud seam details (graduates from 03; design-for-later only)
- Trophy mapping table final form (grammar adopted; per-component decisions graduate from 01/04)

## Out of scope

- Accounts, auth, cloud sync, backend, real multi-user (design-for-later only) — mission says single user
- Social/global leaderboards — personal records only (mission §10)
- React/shadcn/Tailwind install; any runtime dependency; build step (ADR-1)
- Removing working functionality
- Push/deploy (unless the human asks)

## Ticket index

| # | Ticket | Type | Status | Blocked by |
|---|---|---|---|---|
| 01 | visual-world | prototype (HITL) | ready-for-human | none |
| 02 | ia-flow | grilling (HITL confirm) | ready-for-agent | none |
| 03 | domain-persistence | research+grilling (AFK) | ready-for-agent | none |
| 04 | gamification-economy | grilling (AFK) | ready-for-agent | none (consumes 03 events) |
| 05 | player-ux | prototype (HITL) | ready-for-human | 01 (visual direction) |
| 06 | library-ux | prototype (HITL) | ready-for-human | 01 (visual direction) |
| 07 | feedback-loop | grilling (AFK draft, HITL confirm) | ready-for-agent | 04 |
| 08 | verification | task+research (AFK) | ready-for-agent | none |

## Execution workstreams

- **Wave 1 — gamification engines:** gamify 01 xp, 02 streak, 03 achievements. Pure libs + tests; build after product/04 (economy spec) so constants/catalog are not built twice.
- **Wave 2 — design system + shell (after 01/02):** tokens v2, shell/nav, component primitives; then gamify 04/05 restyled against it.
- **Wave 3 — domain + persistence (after 03):** event module, store v2, migrations, export/import v2; then gamify 06 integration.
- **Wave 4 — library, player, quiz, dashboard redesign (after 02/05/06/07 + wave 2):** per-phase with verification after each (mission §27).
- **Wave 5 — animation, a11y/responsive, hardening, polish (after 07/08):** gate 07, then mission §28–31 validation.

## Resolution

(open — charted 2026-09-23)
