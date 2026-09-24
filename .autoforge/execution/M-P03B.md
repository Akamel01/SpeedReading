# M-P03B events-composition — final report (orchestrator-repaired)

- `src/lib/events.js` (pure, imports xp/streak/achievements/challenges/records):
  - `facts({sessions,quizzes})`: `session.completed` (`session:<id>`) + `session.quiz_completed` (`quiz:<sessionId>`) only when a session matches the quiz; sorted (at, key); unique keys; malformed skipped.
  - `rewardMoments({sessions,quizzes,today})`: record (1) / achievement (2) / level (3, emitted at the crossing session) / challenge (4, current period completion) / streak (5, latest run); sorted by priority then at.
  - `sessionMoments({...,sessionId})`: only moments attributable to that session.
- Worker's first version returned facts mapped as type 'record' for sessionMoments (wrong) and had a syntax-broken test; rewritten.
- `test/events.test.js` (6 tests) + `test/invariants.test.js` (I1 XP monotonic, I2 no double award, I7 level-XP round-trip).
- Evidence: `node --test test/events.test.js test/invariants.test.js` green; full suite 175/175.
