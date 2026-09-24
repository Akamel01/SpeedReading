# 01: XP engine and level ladder

**Category:** enhancement

**What to build:** A pure, dependency-free XP engine: every recorded session earns XP; cumulative XP maps to a named level ladder with progress to the next level.

**Blocked by:** None.

**Status:** ready-for-agent

## Agent Brief

**Summary:** XP + levels derived from existing session history. No new store, no DB migration, no persistence.

**Current behavior:** Dashboard shows sessions, WPM, comprehension, trend (lap table). No points, no levels.

**Desired behavior:**
- `src/lib/xp.js` (ESM, no DOM, no imports from `src/ui/`):
  - `sessionXp(session) -> number`
  - `totalXp(sessions) -> number`
  - `levelFor(xp) -> { index, name, threshold, nextThreshold, progress }` (progress 0..1 to next; max level clamps)
- XP is derived only — recomputed from sessions on every render; no ledger record.
- Integer, never negative, monotonic in words read. Malformed/legacy sessions (missing fields) contribute 0, never throw.
- Constraint: WPM must not dominate XP (speed-only grinding must not out-earn reading volume); comprehension may add a bounded bonus only when `comprehensionPct` is a number; drill sessions (`drill:'span'`) earn words at a reduced rate and never a comprehension bonus.
- Level ladder names = book formats, thresholds frozen by `design/direction.md` (architect may adjust values, not the naming scheme).

**Key interfaces:**
- Session shape: `src/app.js` `currentSession` (`wpm`, `wordCount`, `comprehensionPct`, `drill`, `kind`, `startedAt`, `endedAt`)
- Reuse `src/lib/metrics.js` helpers where useful; do not duplicate them.
- No store change, no settings key in this ticket.

**Acceptance criteria:**
- [ ] `node --test test/xp.test.js` green: empty → 0; monotonic in words; comprehension bonus bounded; drill reduced rate; exact level boundaries; malformed input → 0 XP, no throw
- [ ] No runtime dependency; `node --check src/lib/xp.js` clean
- [ ] Level names + thresholds match `design/direction.md`

**Out of scope:** XP spending, multipliers, boosts, XP persistence, notifications, leaderboards.
