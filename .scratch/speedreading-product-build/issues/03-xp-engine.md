# 03: XP and level engine

**What to build:** A pure XP and level engine so every session earns visible XP: session XP from words read, comprehension and target bonuses, drill half-rate, a daily cap, a same-text same-day repeat factor, and an 11-tier book-format ladder. No UI in this ticket — it is a foundation slice.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Plan module:** M-G01

- [ ] Unit tests cover: empty input, monotonic in words, daily cap, repeat factor, comprehension and target bonuses, drill rate, the worked example, exact level boundaries, max-level clamp, malformed input
- [ ] XP is integer, never negative; malformed sessions contribute zero without throwing
- [ ] Constants match the economy decision (ADR-24)

## Resolution

Closed 2026-09-23 (W1). Orchestrator-repaired; review M-G01-r2 APPROVED_WITH_NOTES. Evidence: test/xp.test.js green (caps, repeat, bonuses, ladder, worked examples).
