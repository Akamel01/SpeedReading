# Review — lib-player (`src/lib/player.js`, `test/player.test.js`)

Reviewer: autoforge-reviewer (independent, read-only)
Date: 2026-09-22
Contract source: `plan.md` §1 (interface freeze, lines 24–30), §2 M9 (lines 181–187), ADR-5 (`architecture/decisions.md:31-35`), objective contract.

## Verdict: CHANGES_REQUIRED

All four objective checks pass (tests green, cadence drift-free, pause/resume, clamp, empty-list play, static greps clean). Two reachable public-API crash paths and one per-chunk timing-semantics defect remain. Findings 1–3 require changes; 4–5 are notes.

## Evidence run

```
$ node --test test/player.test.js
✔ nextDelay scales with chunk word count
✔ emits one chunk event per deadline, then end once
✔ orpParts are computed per word from lib/orp
✔ pause stops emissions; play resumes from same index
✔ seek and step clamp to bounds
✔ setWpm applies from the next chunk deadline only
✔ emits state events on transitions and getState is accurate
✔ empty chunk list ends immediately without hanging
ℹ tests 8  ℹ pass 8  ℹ fail 0        EXIT:0

$ node --test
ℹ tests 64  ℹ pass 64  ℹ fail 0     EXIT:0   (no regressions)

$ grep -n "document\|window" src/lib/player.js      -> no output (exit 1)
$ grep -n "setTimeout\|requestAnimationFrame" src/lib/player.js
21:    : (cb) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(cb, 0));
```

Own probe (fake clock, 50 ms steps, fake scheduler, `nextDelay` imported from the module):

```
T1 nextDelay(1 word,600) = 100 ms
T1 emission times: 0@100,1@200,2@300 | end@ 300 | end count 1
T1 gaps: 100,100 ms
T2 after pause: state {"playing":false,"index":1,"wpm":600} seen 0@100
T2 resume emissions: 0@100,1@800,2@900 | end count 1
T3 clamp seek(99)=2 step(-99)=0 step(1)=1 seek(-7)=0
T4 empty: end count 1 | queued frames 0 | state {"playing":false,"index":0,"wpm":300}
T5 after end: state {"playing":false,"index":1,"wpm":600}
T5 replay THROWS: TypeError: Cannot read properties of undefined (reading 'words')
T6 empty seek THROWS: TypeError: Cannot read properties of undefined (reading 'words')
T6 mixed emission times: 0@400,1@600 | end@ 600 | per-chunk dwell: 200,0 (expected: 2-word=400, 1-word=200)
```

Checks 1–4 from the objective: PASS. Cadence gaps are exactly 100 ms (no drift); pause at index 1 resumes at index 1 with a fresh anchor (no fast-forward); `end` fires exactly once in every run; clamps hold; empty-list `play()` ends once with zero scheduled frames; static greps clean with rAF/setTimeout only in the default `schedule` fallback (`player.js:21`).

## Findings

1. **Per-chunk dwell uses the NEXT chunk's delay; last chunk is never displayed** — `src/lib/player.js:61-70`. On emission the engine increments `index` and then does `nextDue += nextDelay(list[index], currentWpm)` (the delay of the chunk that has not been shown yet), and `finish()` runs in the same tick as the final `chunk` event (`player.js:65-68`). Probe T6: a 2-word chunk at 300 wpm displays 200 ms, the 1-word final chunk displays 0 ms, `end@600` == `1@600` (`per-chunk dwell: 200,0; expected 400,200`). Plan §1, line 30 freezes the purpose: "a 2-word chunk at 300 wpm displays 400ms". Mixed-size streams are the normal case (ADR-8 chunker emits 1–3 word chunks), and a view that tears down on `'end'` never paints the last chunk. Session-level math is unaffected (play→end still equals `wordCount*60000/wpm`), so the worker's tests cannot see it.
   Required: chunk k must display for `nextDelay(chunk_k, wpm)` and `end` must fire only after that interval, keeping deadlines anchored to the previous *deadline* (no `clock()` re-anchoring, no drift). Minimal coherent shape: `play()` anchors `nextDue = clock()` so the first chunk emits on the first frame; after emitting chunk k, `nextDue = D_k + nextDelay(chunk_k, currentWpm)`; `finish()` runs on a later frame once `clock() >= nextDue` with `index >= list.length`. If instead the current semantics are the intended freeze, `plan.md:30`'s "displays 400ms" wording is wrong and must be re-frozen — decide explicitly, do not leave contract and code disagreeing.

2. **`play()`/`toggle()` after `end` throws** — `src/lib/player.js:85`. After a completed run `index === list.length`; `play()` skips the empty-list guard, sets `playing = true`, then `nextDelay(list[index], ...)` dereferences `undefined`. Probe T5: `TypeError: Cannot read properties of undefined (reading 'words')` on replay of a 1-chunk list. Any "play again" path (or a late `toggle()`) crashes instead of restarting or no-oping.
   Required: handle `index >= list.length` in `play()` (restart from 0, or finish/no-op per frozen behavior) so no public method throws from a state reachable through the public API.

3. **`seek()`/`step()` on an empty chunk list throws** — `src/lib/player.js:98-101`. With `chunks: []`, `clamp(i, 0, max(0, -1))` yields index 0 and `nextDelay(list[0], ...)` throws the same TypeError. Probe T6: `T6 empty seek THROWS: TypeError: Cannot read properties of undefined (reading 'words')`. Note the objective's empty-list check covered `play()` only; `play()` itself passes (T4).
   Required: guard `list.length === 0` in `seek()`/`step()` (or make `nextDelay` total).

4. **Default clock deviates from the frozen signature** — `src/lib/player.js:18` uses `() => Date.now()`; `plan.md:25` freezes `now=performance.now`. `Date.now()` is non-monotonic: a backward clock step stalls the deadline loop (nothing emits until wall time catches up), a forward step bursts chunks. `performance.now()` is monotonic and is the ADR-5 intent. Low severity (clock is injectable; app may always inject), but it is a contract deviation — fix to `() => performance.now()` or record the deviation.

5. **`pause()` leaves the scheduled frame live; same-tick pause+play runs two frame chains** — `src/lib/player.js:72,89-93`. `pause()` does not cancel the pending frame, and a frame that runs after `play()` rescheduled (because `playing` is true again) keeps the old chain alive alongside the new one; both re-enter `loop()` every frame until one dies. No duplicate emissions observed (the `clock() >= nextDue` guard holds because delays are positive), but it doubles frame work and makes the worker's `pause` test depend on chain interleaving. Optional: store a cancel handle from `schedule` or use a generation counter.

6. **Passing checks / notes.** `nextDelay` pure and correct (`player.js:8-10`, probe T1); `'chunk'` payload `{index, chunk, orpParts}` correct with per-word `orpParts` (`player.js:63`); `'state'` emitted on play/pause/seek/setWpm/finish and `getState` accurate (probe T2/T5 states); `'end'` exactly once per run including empty list (T1/T2/T4); listener exceptions isolated (`player.js:34-38`); no DOM access, timers only via the `scheduleFrame` seam; `package.json` is `{"type":"module"}` so the ESM imports are deterministic. ADR-5 hidden-tab behavior is a single exposed `pause()` hook the adapter calls — satisfied at engine level.

## Required changes (ordered)

1. Fix the dwell/`end` sequence per finding 1 (or obtain an explicit re-freeze of `plan.md:30`).
2. Guard replay-after-end in `play()` (finding 2).
3. Guard empty-list `seek()`/`step()` (finding 3).
4. Optional: default `now` to `performance.now` (finding 4); frame-chain cleanup (finding 5).

Re-review after 1–3: rerun `node --test test/player.test.js` (including any updated timing assertions) and the probe traces above; expected per-chunk dwell equals each chunk's own `nextDelay` and `end` strictly after the final `chunk` event.

## Artifact

- This file: `.autoforge/reviews/lib-player.md`
- Probe (temp, not repo): `/var/folders/c8/816q70zd5dvd48_49_npqj8w0000gn/T/opencode/player-probe.mjs` (fake clock 50 ms steps, fake scheduler; outputs quoted above)
