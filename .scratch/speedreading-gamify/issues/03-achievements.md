# 03: Achievement engine (stamp definitions + evaluation)

**Category:** enhancement

**What to build:** Pure achievements engine: fixed stamp definitions, evaluation of session/quiz history into locked/unlocked/progress states, unlock timestamps derived from history.

**Blocked by:** None.

**Status:** ready-for-agent

## Agent Brief

**Summary:** Definitions + evaluator. Unlocked state is derived; only "seen" state is persisted later (ticket 06). No new store.

**Desired behavior:**
- `src/lib/achievements.js` (ESM, no DOM):
  - `ACHIEVEMENTS`: ordered list of `{ id, title, description, requirement, tier }` (unique ids; factual requirement text).
  - `evaluate(sessions, quizzes, { today, streakStats }) -> [{ ...definition, unlocked, unlockedAt, progress: { current, target, pct } }]`
- Coverage: first session; volume milestones (words read); consistency milestones (streak — receives `streakStats` as input, does NOT import `streak.js`); comprehension milestones (only from quiz-scored sessions, never drill recognition); speed milestones gated by comprehension (a WPM stamp requires ≥80% on that same session's quiz — speed alone earns nothing).
- Deterministic; no `Date.now()`. `unlockedAt` = earliest qualifying session `endedAt` (or quiz `createdAt` when the criterion is quiz-scored).
- `progress.pct` clamps 0..100. Legacy sessions with missing fields never throw.
- Copy rule (ADR-18): no speed promises; requirement text factual.
- Definition list is frozen by `design/direction.md` (architect may add/remove entries with justification; ids stay stable).

**Key interfaces:**
- Session fields: `wordCount`, `wpm`, `comprehensionPct` (null for drill/unscored), `drill`, `endedAt`, `kind`
- Quiz records: `score.pct` (fallback when `session.comprehensionPct` absent)
- Must not import `xp.js` or `streak.js` (kept independently testable)

**Acceptance criteria:**
- [ ] `node --test test/achievements.test.js` green: each definition boundary tested; drill sessions never unlock comprehension/speed stamps; pct clamps; deterministic order; malformed input no-throw
- [ ] Every achievement has a unique id + human-readable requirement string
- [ ] `node --check src/lib/achievements.js` clean

**Out of scope:** badge art, unlock UI (ticket 04), persistence of unlocked state, sharing.
