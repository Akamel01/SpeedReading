# Re-review: src/lib/player.js (round 2)

Date: 2026-09-22 · Reviewer: autoforge-reviewer (read-only)
Artifact under review: `src/lib/player.js` — sha1 `1dfacedc6c3d4731f3dcf3775899d9d5d2a3314b`
Tests: `test/player.test.js`

Prior round: CHANGES_REQUIRED (last-chunk dwell before end, replay after end, empty-list seek/step, performance.now default). All four fixes verified below.

## 1. Test runs (real output)

`node --test test/player.test.js`:
```
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 61.77075
```

`node --test` (full suite):
```
ℹ tests 75
ℹ suites 0
ℹ pass 75
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 195.313083
```

## 2. Own probe (fake clock, `now`/`schedule` injected)

Script: `/var/folders/c8/816q70zd5dvd48_49_npqj8w0000gn/T/opencode/probe-r2.mjs` (2 one-word chunks @600wpm → 100ms/chunk).

```
A: chunk0@100 chunk1@200 end@300
B: queue after pause = 1
B: c0@100 c1@210 end@310 | paused state = {"playing":false,"index":1,"wpm":600}
C: [0,1,"end",0,1,"end"] | state = {"playing":false,"index":2,"wpm":600}
D: err = null | state = {"playing":false,"index":0,"wpm":600}
```

- A: chunk0@100, chunk1@200, end@300 — matches spec exactly (end after last chunk's own 100ms dwell). FIXED.
- B: pause after chunk0 at t=100; resume emitted chunk1@210 (clock-anchored to 200 + 10ms probe granularity), end@310, index preserved at 1 on pause. FIXED.
- C: play→end→play yields `[0,1,"end",0,1,"end"]`, no crash, index reset. FIXED.
- D: empty list — `seek(5)`, `step(2)`, `toggle()`, drain: `err = null`, index stays 0. FIXED.

## 3. Static checks (real output)

`grep -n "document\|window" src/lib/player.js` → exit=1, no matches (DOM-free holds).

`grep -n "requestAnimationFrame\|setTimeout" src/lib/player.js`:
```
23:    : (cb) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(cb, 0));
```
Single occurrence, only inside the default `scheduleFrame` fallback. Injected `schedule` bypasses it (probe used a queue). `performance.now` default (line 20) also above the injectable `now`, with `Date.now()` fallback. FIXED.

## Verdict

**APPROVED**

Findings (notes only, non-blocking):
1. `play()` on an empty list does not reset `endEmitted`; a second empty-list `play()` emits `state` but no second `end`. Not covered by any requirement; flag only if empty-list replay semantics are ever specified.
2. `seek()` during the pending-end dwell cancels the dwell (`pendingEnd = false`) and re-anchors — coherent behavior, but untested; add a test if the contract tightens.
3. Probe granularity: B's +10ms offset is probe step size, not player drift — chained deadlines are `nextDue += delay` (line 73).
4. Pause during pending-end followed by play restarts from index 0 (since `index >= list.length`); consistent with replay fix, note only.

Artifact path: `.autoforge/reviews/lib-player-r2.md`
