# 08: Event composition and invariants

**What to build:** A pure event projection over the economy engines: the ordered, unique-keyed fact list (malformed skipped), the reward moments for the just-completed session in priority order (record, achievement, level, challenge, streak), and the invariant suite: XP monotonic, no double award, level-XP round trip.

**Blocked by:** 03 (XP engine), 04 (Streak engine), 05 (Achievements engine), 06 (Challenges and personal records).

**Status:** ready-for-agent

**Plan module:** M-P03B

- [ ] Facts are sorted and unique-keyed; malformed records skipped; session attribution correct
- [ ] Reward moments are limited to the just-completed session and ordered by priority
- [ ] Invariant tests green: XP monotonic, no double award per event, level always corresponds to XP

## Resolution

Closed 2026-09-23 (W1b). Orchestrator-repaired (facts/moments payloads per ADR-22). Evidence: events/invariants unit green; 176/176.
