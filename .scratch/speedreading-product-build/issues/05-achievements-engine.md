# 05: Achievements engine

**What to build:** A 26-achievement catalog and evaluator: each entry carries id, title, category, rarity, requirement, hidden flag and a text glyph; evaluation returns unlocked state, earliest unlock time, and progress; unlocks happen once; drill recognition never unlocks comprehension or speed stamps.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Plan module:** M-G03

- [ ] 26 unique ids; every entry has a non-empty glyph; catalog matches the economy decision (ADR-24)
- [ ] Unit tests cover each requirement boundary, hidden-renders-locked, drill exclusion, progress clamping 0–100, deterministic ordering, malformed input
- [ ] No imports from the XP or streak engines

## Resolution

Closed 2026-09-23 (W1). Orchestrator-repaired; review M-G03-r2 findings fixed. Evidence: 26-entry catalog unit green (glyphs, hidden, drill exclusion, I5/I8).
