# 02: Daily streak engine

**Category:** enhancement

**What to build:** Pure streak engine over session dates: current streak, longest streak, and the per-day map a calendar renders from.

**Blocked by:** None.

**Status:** ready-for-agent

## Agent Brief

**Summary:** Daily reading streak from recorded sessions. Local calendar days, derived, no new store, deterministic (today injected).

**Desired behavior:**
- `src/lib/streak.js` (ESM, no DOM):
  - `dayKey(ts) -> 'YYYY-MM-DD'` (local time, zero-padded)
  - `dayMap(sessions) -> Map<dayKey, { count, words }>` (ascending)
  - `streakStats(dayMap, today) -> { current, longest, lastDay, activeToday }`
- A day counts when ≥1 session was recorded that day. Streak alive when the last active day is today or yesterday; any missed day breaks it. No freezes.
- `today` is injected (no `Date.now()` inside the module) so tests are deterministic.
- Malformed sessions (no numeric `startedAt`) are skipped, never throw.

**Key interfaces:**
- Session `startedAt` epoch ms; caller (app.js) passes `store.getAll('sessions')`.
- Calendar UI (ticket 04) consumes `dayMap` + `streakStats`.

**Acceptance criteria:**
- [ ] `node --test test/streak.test.js` green: empty → `{current:0, longest:0}`; same-day multiple sessions = 1 day; consecutive run; gap breaks; yesterday-only run is alive; month/year boundary; injected today
- [ ] No dependency on `xp.js` or `achievements.js`
- [ ] `node --check src/lib/streak.js` clean

**Out of scope:** streak freezes, reminders/notifications, weekly/monthly units, timezone conversion beyond local day.
