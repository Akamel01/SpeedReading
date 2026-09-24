# 04: Streak engine

**What to build:** A pure daily-streak engine: local day keys, a per-day map, current and longest streak with yesterday-grace, and an injected "today" so behaviour is deterministic and timezone-correct without a timezone library.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Plan module:** M-G02

- [ ] Unit tests: empty; same-day multiple sessions count once; consecutive run; a gap breaks; yesterday-only is alive; month and year boundaries; injected today
- [ ] Malformed sessions are skipped, never throw
- [ ] No dependency on the XP or achievements engines

## Resolution

Closed 2026-09-23 (W1). Worker fix + orchestrator repair; review findings fixed. Evidence: test/streak.test.js green (boundaries, gaps, I4).
