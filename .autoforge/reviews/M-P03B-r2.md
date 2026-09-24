# Review — M-P03B-r2 events-composition (re-run after orchestrator rewrite)

- Reviewer: autoforge-reviewer (independent, read-only). Date: 2026-09-23.
- Target: `src/lib/events.js`, `test/events.test.js`, `test/invariants.test.js`.
- Contract: `.autoforge/architecture/decisions.md` ADR-22 event table (lines 238–250) + §13 freeze (lines 415–424), ADR-24 priority order (line 339) and XP sources (bonusXp), ADR-23 I1/I2/I7 (lines 262–264, 406); ticket `.scratch/speedreading-product-build/issues/08-events-composition.md`; plan M-P03B (`plan.md:122-129`); work-order `M-P03B`.
- Prior review: none for M-P03B (worker v1 was not reviewed; this is the first independent pass, post-rewrite).

## Verdict: CHANGES_REQUIRED

The functional core is correct and well-tested for what it covers: exact three-function surface, pure (no clock/DOM), facts sorted/unique/malformed-skipped, priority order, level crossing, no-throw, 173/173 repo tests green. Two blockers: the ADR-22 **payload freeze is not implemented** for facts or moments (downstream consumers reading `payload.correct/total/pct/edited`, `payload.comprehensionPct`, `payload.xp`, `payload.periodStart`, `payload.day` get `undefined`), and the streak moment key violates the frozen `streak:<dayKey>` form. Three majors: level moments ignore ADR-24 bonus XP (probe: event says Pamphlet, true XP is Chapbook), day-record and quiz-unlocked-achievement moments are never attributable to the just-completed session, and the invariant tests do not use the mandated deterministic-PRNG property methodology nor assert moment-key uniqueness.

## Evidence (independently reproduced)

### 1. Acceptance commands
```
$ node --test test/events.test.js test/invariants.test.js
ℹ tests 9  ℹ pass 9  ℹ fail 0  ℹ duration_ms 65.7
$ node --check src/lib/events.js → SYNTAX_OK
$ node --test test/*.test.js → ℹ tests 173  ℹ pass 173  ℹ fail 0   (no regression)
$ grep "Date.now\|new Date" src/lib/events.js → no match
$ imports → exactly ./xp.js, ./streak.js, ./achievements.js, ./challenges.js, ./records.js
$ exports → ["facts","rewardMoments","sessionMoments"]  (exactly §13, no shadowing)
```

### 2. Interface diff vs §13 freeze (decisions.md:419–424)
| frozen | actual | invented | missing |
|---|---|---|---|
| `facts({sessions,quizzes}) -> Fact[]` | exact | — | — |
| `Fact = {type, at, key, sessionId, payload}` | exact outer shape | — | payload fields (B1) |
| `rewardMoments({sessions,quizzes,today}) -> Moment[]` | exact | — | payload fields (B2) |
| `Moment = {type:'record'\|'achievement'\|'level'\|'challenge'\|'streak', at, key, priority, payload}` | exact outer shape; priorities 1/2/3/4/5 match | — | — |
| `sessionMoments({sessions,quizzes,today,sessionId}) -> Moment[]` | exact | — | attribution gaps (M2) |

### 3. Probes (`/tmp/p03b-probe*.mjs`, throwaway; outputs verbatim)
- **(a) unlinked quiz** → `[]` ✓ (facts `{sessions:[], quizzes:[orphan]}` produces nothing).
- **(b) duplicate session records (I2)** → `["session:dup"]` ✓ one fact; `facts([a,a]) → ["session:a"]`.
- **(c) sessionMoments(A) vs B** → `onlyA = [record…@A, achievement…@A, level:1@A]`, all of B's record/achievement moments (at B) excluded ✓; c-all priority vector `[1×11, 2×5, 3]` ascending ✓.
- **(d) level crossing** → `{"type":"level","at":<sessionA>,"key":"level:1","priority":3,"payload":{"index":1,"name":"Pamphlet","threshold":100}}` ✓ fires at the crossing session (1000-word first session).
- **(e) priorities ascending** → `e-sorted true` ✓.
- **(f) malformed/no-throw** → `{facts:0, moments:0, sessionMoments:0, noThrow:true}` for null/{}/NaN/42/'str'/NaN-today/object-sessionId ✓.
- **(x1) fact payloads** → session: `{textId, wordCount, wpm, drill}`; quiz: `{quizId, score:{pct,correct,total}}` — frozen fields absent (B1).
- **(x2) day record** → d2 (5000 words vs 500) breaks `most-words-day`, yet `sessionMoments(d2) = ["level:level:2","challenge:…"]` — no record moment (M2).
- **(x3) quiz-unlocked achievements** → `perfect-quiz`/`first-quiz` unlocked at quiz `createdAt` (session endedAt + 5 s) are in `rewardMoments` but absent from `sessionMoments(sessionId)` (M2).
- **(x4) bonus XP** → same session: dashboard-style `totalXp` = 445 → level 2 `Chapbook`; event level moment = index 1 `Pamphlet` (M1).
- **(x5) multi-level jump** → 30 000-word session crosses 100 and 300 → only `level:2` emitted, `level:1` skipped (m1).
- **(x6) duplicate sessions in rewardMoments** → no key duplication and no level inflation (same-text repeat factor halves the second) — no finding.

## Ranked findings

### Blocker
1. **B1 — facts payloads do not implement the ADR-22 frozen payloads** (`src/lib/events.js:32`, `:46`). `session.completed` emits `{textId, wordCount, wpm, drill}`; frozen (`decisions.md:242`): `{sessionId, textId, chapterIndex, kind, chunkSize, targetWpm, wordCount, elapsedMs, wpm, comprehensionPct|null, drill|null}` — six fields missing though all exist on real session records (`src/app.js:177-194`). `session.quiz_completed` emits `{quizId, score}`; frozen (`:243`): `{sessionId, quizId, correct, total, pct, edited}` — a consumer written to the freeze gets `undefined` for all four. Fix: emit the frozen fields verbatim (read `correct/total/pct/edited` from the quiz record; keep `sessionId` top-level per §13 Fact, duplicating inside payload is harmless). Extend `events.test.js` to assert the full payload key sets.
2. **B2 — moment payload/key drift from the ADR-22 table** (`events.js:66, :77, :94, :112, :125-127`). record `{id,…}` vs frozen `{recordId, value, previous, sessionId?, day?}` (`day` is dropped though `records.js:166` supplies it); achievement `{id,title,glyph}` vs `{achievementId, sessionId?}` (sessionId never populated — see M2); level `{index,name,threshold}` vs `{index,name,xp}`; challenge `{id,title,xp,period}` vs `{challengeId, period, periodStart, xp}`; streak key `streak:${stats.current}` vs frozen `streak:<dayKey>` (`:245`) and payload missing `day`. Fix: rename/add the frozen fields and make the streak key day-based; extra display fields may stay.

### Major
3. **M1 — level moments ignore ADR-24 bonus XP** (`events.js:87`). `totalXp(cumulative, {dayMap})` omits `challengeCompletions/recordImprovements/achievementUnlocks` (`src/lib/xp.js:105-127`); probe x4: true XP 445 (`Chapbook`) vs event `Pamphlet`. If M-P07B computes dashboard `xp`/`level` with bonuses — the frozen `totalXp` signature exists for exactly that — the summary moment contradicts the level card (I7 correspondence broken at the projection layer). Fix (decision required): feed cumulative bonuses (improvements/unlocks with `at ≤ s.endedAt`) into the projection, or document session-only level projection and pin the dashboard to the identical input set.
4. **M2 — moments caused by the just-completed session are silently dropped from `sessionMoments`** (`events.js:140-144`). (a) Day records (`records.js:48,166`) carry no `sessionId` and `at` = local midnight, so they never match `target.endedAt` (probe x2). (b) Quiz-unlocked achievements (`achievements.js:198-199`) unlock at quiz `createdAt`, so `at ≠ endedAt` and payload has no `sessionId` (probe x3) — the summary loses "achievements unlocked"/"records broken" for the session's own quiz. Fix: attribute day records via `imp.day → last session of that day` (or `sessionId` when present); attribute quiz achievements via the session's `quizId`/quiz `createdAt` (or extend `evaluate` output — cross-module call).
5. **M3 — invariant tests do not match the mandated methodology** (`test/invariants.test.js:11-35`). Plan M-P03B and ADR §28 (`decisions.md:406`) require "a tiny deterministic PRNG (no deps) to generate append sequences for I1/I2/I7"; current tests are three fixed cases. I2 asserts facts dedupe only — no assertion that `rewardMoments` keys are unique ("timeline keys unique"). Fix: add deterministic-PRNG property loops (I1 non-decreasing over random appends; I2 facts+moments key uniqueness under duplicate ids; I7 round-trip over random XP), plus payload-key and moment-key assertions in `events.test.js`.

### Minor
6. m1 — multi-level jumps emit only the final index (`events.js:88-97`; probe x5: `level:1` skipped). ADR-22 key `level:<index>` implies one moment per crossed index; note/decide.
7. m2 — O(n²) level loop: `buildDayMap` + `totalXp` rebuilt per session (`events.js:87`); binding-9 budget at 1000 sessions. Optimize or record the ceiling.
8. m3 — historical under-emission: one streak moment for the latest run only and `current >= 2` skips first-day streak updates (`events.js:119`, cf. `decisions.md:221` "activeToday newly true"); challenge moments only for `today`'s period (`events.js:101-115`) — past-period completions are never projected.
9. m4 — `facts` accepts non-string ids (`events.js:16-18`) while ADR-23 import requires non-empty string ids; `String(s.id)` can collide for object ids. Harden `hasId` to string ids.
10. m5 — `events.test.js` challenge test does not verify prior-period exclusion; no malformed/no-throw test in the suite (probe f passes). Fold into M3.

## Required changes (blocking)
- B1: complete both fact payloads to the ADR-22 field sets; add payload assertions to `test/events.test.js`.
- B2: rename/add moment payload fields (`recordId`, `day`, `achievementId`, `xp`, `challengeId`, `periodStart`) and change the streak key to `streak:<dayKey>` with `day` in the payload.
- M1: resolve the level-XP input model (bonuses in or documented+aligned).
- M2: attribute day records and quiz achievements to the completed session.
- M3: replace/augment fixed invariant cases with the deterministic-PRNG property loops and assert timeline key uniqueness.
