# 04: gamification-economy — XP, levels, achievements, challenges, records

**Type:** grilling (AFK) · **wayfinder:grilling**
**Category:** enhancement
**Status:** ready-for-agent
**Blocked by:** none (consumes ticket 03's event list once drafted)

## Question

What is the exact gamification economy and rule set?

- XP: value per source (session completion, quiz completion, WPM target, comprehension target, PR, streak day, challenge, words read, session count, consistency, return after inactivity, milestone). Explicit formula, integer, legible to the reader.
- Anti-farming: caps per day/source, diminishing returns, no XP for replays of the same content within a window, no double award per event; rules must be testable invariants.
- Levels: curve + named tiers (the gamify wave's book-format ladder is the candidate), threshold table, max level behavior.
- Achievement catalog: id, title, description, category, rarity, requirement, hidden/visible — covering the mission §16 examples; testable predicates; unlock-once guarantee.
- Challenges: daily/weekly catalog, deterministic timezone-aware reset (local calendar), progress derivation without the UI being open.
- Personal records: highest WPM, best comprehension, best combined, longest session, longest streak, most words/day, most sessions/day, best per mode; tie rules.
- Reward prioritization: what the completion flow surfaces when several fire at once (mission §11 — most meaningful first, never all at once).
- Copy rules: no speed promises (ADR-18), no guilt framing, no fake social comparison.

## Deliverable

Economy spec with exact numbers + tables, achievement catalog (machine-readable list), invariant list, reward-priority ordering. Feeds architect + planner; supersedes/extends the gamify wave's definitions.

## Constraints

- Deterministic + testable (pure functions); no timezone library; local-date logic explicit.
- Drill/recognition sessions (span drill) never earn comprehension/speed awards.
- Values must not incentivize speed-over-comprehension.

## Out of scope

- Badge art, unlock animation specifics (tickets 01/07).
- Social leaderboards.

## Resolution

(pending)
