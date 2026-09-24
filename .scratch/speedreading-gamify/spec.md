# Spec — speedreading-gamify

## Objective

Gamify the SpeedReading UI using the gamification grammar of Trophy UI (streaks, XP/points, levels, achievements, unlock moments, progress viz, podium), adapted to this app's constraints and its existing folio/ink design world.

## Upstream

- Trophy UI: https://github.com/trophyso/ui (MIT). Registry: https://ui.trophy.so/r/registry.json. 17 components across streak, achievement, leaderboard, points/levels families.
- Trophy components are React + shadcn/ui + Tailwind. This app is ADR-1: no build, no framework, zero runtime dependencies, vanilla ES modules. Components are NOT installed; their grammar, states, and data shapes are adapted natively.

## Scope (in)

- Pure engines: `src/lib/xp.js`, `src/lib/streak.js`, `src/lib/achievements.js` — derived from existing session/quiz history.
- UI (folio/ledger style): XP + level card, streak badge + day calendar, achievement stamps + unlock moment, WPM ledger chart, personal-best podium, compact header HUD.
- Integration into dashboard + header; single persisted delta `settings.seenAchievements`.
- A11y (ADR-7), reduced motion, copy guardrails (ADR-18), zero-network posture (ADR-10).

## Scope (out)

- Installing React/shadcn/Tailwind/recharts or any runtime dependency (ADR-1).
- Accounts, cloud sync, social/global leaderboards, telemetry, notifications (ADR-10 + README non-goals).
- Store schema version bump, XP ledger records, streak freezes, points-boost multipliers, new views/routes.
- Speed/comprehension overclaim copy; guilt-framed streak copy.

## Acceptance

- Engines unit-tested with `node --test`; full suite stays green.
- Browser walkthrough extended: cards render from real session data; unlock moment appears once; reduced-motion honored; zero network after load.
- Copy grep for speed-promise and guilt words stays clean.
- Independent review per module + validator GO.
