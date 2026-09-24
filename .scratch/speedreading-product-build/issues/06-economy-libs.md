# 06: Challenges and personal records

**What to build:** Daily and weekly challenges with deterministic local-calendar rotation and resets that never depend on the UI being open, plus the 10 personal records (fastest WPM, best comprehension, best combined, longest session, most words/day, most sessions/day, longest streak, fastest WPM per chunk size) with earliest-tie rules and drill exclusions.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Plan module:** M-P04

- [ ] Unit tests: rotation determinism including a DST-boundary fixture; period reset via injected now; all 10 record ids present exactly once; tie rules; drill exclusions; malformed input
- [ ] Resets are derived from timestamps — no dependence on the UI being open

## Resolution

Closed 2026-09-23 (W1). Orchestrator-repaired; review findings fixed. Evidence: challenges/records unit green (rotation, DST, ties, 10 ids, drill exclusion).
