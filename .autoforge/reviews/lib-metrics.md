# Module Review — lib-metrics

- Reviewer: autoforge-reviewer (read-only, independent of worker)
- Date: 2026-09-22
- Inputs read: `src/lib/metrics.js`, `test/metrics.test.js`, `.autoforge/architecture/decisions.md` (ADR-9, §3 signature, §4 data model), `.autoforge/plans/plan.md` M5 (`plan.md:146-152`), `.autoforge/execution/lib-metrics.md`, `.autoforge/state.json`
- Method: read current files, ran the acceptance command, ran independent probes importing the real module, deep-freeze purity probe, ESM/alias grep. No repo files modified.

## Verdict: APPROVED_WITH_NOTES

All contract semantics in the current files are confirmed: ESM surface, no `summarizeSessions` alias, guards, fallback field, trend gating, suggestion rules, purity. Two checks named in the M5 acceptance bullet lack direct tests in the suite (`trend:'down'`; `wpm(0, x)=0`), but both pass under independent probing, so this is a coverage gap, not a behavior defect. The execution artifact's evidence ("12 tests, 12 passed") does not match the current suite (8 tests) — worker claims were not used as evidence here. No dependent module is blocked.

## Evidence (real outputs)

### 1. `node --test test/metrics.test.js` (cwd repo)
```
✔ wpm basic (0.509708ms)
✔ wpm guard elapsed zero (0.072209ms)
✔ comprehensionPct boundaries (0.779ms)
✔ summarize multiple sessions reads comprehensionPct (0.312166ms)
✔ summarize with few sessions -> flat (0.079167ms)
✔ suggestNextWpm adheres to rules (0.073958ms)
✔ summarize reads comprehension from fallback field (0.062416ms)
✔ purity: input not mutated (0.065042ms)
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
```

### 2. Independent probes (real output, store-shaped `{wpm, comprehensionPct}` records)
```
n=3 [{60,80},{80,90},{70,60}] => {"sessions":3,"bestWpm":80,"avgWpm":70,"avgComprehension":76.66666666666667,"trend":"flat"}
n=4 up [60,80,70,90] => {"sessions":4,"bestWpm":90,"avgWpm":75,"avgComprehension":70,"trend":"up"}
n=4 down [90,70,80,60] => {"sessions":4,"bestWpm":90,"avgWpm":75,"avgComprehension":70,"trend":"down"}
n=4 flat [70,80,70,80] => {"sessions":4,"bestWpm":80,"avgWpm":75,"avgComprehension":70,"trend":"flat"}
n=6 up [60,60,60,80,90,100] => {"sessions":6,"bestWpm":100,"avgWpm":75,"avgComprehension":70,"trend":"up"}
n=6 down [100,90,80,60,60,60] => {"sessions":6,"bestWpm":100,"avgWpm":75,"avgComprehension":70,"trend":"down"}
n=6 flat [70,70,70,70,70,70] => {"sessions":6,"bestWpm":70,"avgWpm":70,"avgComprehension":70,"trend":"flat"}
n=0 [] => {"sessions":0,"bestWpm":0,"avgWpm":0,"avgComprehension":0,"trend":"flat"}
mixed comp fields [{100,90pct},{100,comprehension:50}] => {"sessions":2,"bestWpm":100,"avgWpm":100,"avgComprehension":70,"trend":"flat"}
suggestNextWpm(300,80) => 330
suggestNextWpm(300,79) => 300
suggestNextWpm(300,60) => 300
suggestNextWpm(300,59) => 270
suggestNextWpm(300,50) => 270
suggestNextWpm(-5,85) => 60
suggestNextWpm(10,90) => 60
suggestNextWpm(50,85) => 60
wpm(0,60000) => 0
wpm(300,0) => 0
wpm(300,60000) => 300
comprehensionPct(3,4) => 75
comprehensionPct(1,0) => 0
```
All match the contract: `comprehensionPct` consumed with `comprehension` fallback, trend flat for n<4, +10% at ≥80, −10% at <60, hold at 60–79, min-60 floor.

### 3. Purity probe (deep-frozen input)
```
deep-frozen summarize => no throw; result={"sessions":4,"bestWpm":120,"avgWpm":105,"avgComprehension":81.25,"trend":"down"}
frozen input after => [{"wpm":100,"comprehensionPct":80},{"wpm":120,"comprehensionPct":90},{"wpm":90,"comprehensionPct":70},{"wpm":110,"comprehensionPct":85}]
```
No throw under `"use strict"` on frozen array + frozen records; input unchanged. Pure confirmed.

### 4. ESM/alias grep
`grep -n "require(\|module.exports\|summarizeSessions" src/lib/metrics.js test/metrics.test.js` printed nothing; exit status 1. Exports are `export function` for all four names; no legacy alias.

## Findings (ranked)

### F1 — LOW — `trend:'down'` is untested in the suite though M5 acceptance names it
`plan.md:151` enumerates "summarize trend up/flat/down". `test/metrics.test.js` exercises `up` (line 37) and `flat` (line 48) only. Down behavior is correct (probe: `n=4 down ... "trend":"down"`), so no runtime fix needed; one 4-line test case would close the acceptance wording and protect the branch from regression.

### F2 — LOW — Execution artifact evidence does not match current files
`.autoforge/execution/lib-metrics.md:13` claims "12 tests, 12 passed"; `node --test` on the current `test/metrics.test.js` reports `tests 8 / pass 8`. Behavior is verified above, but the report is stale or misstated and should not be cited as evidence by downstream stages.

### F3 — LOW — `suggestNextWpm` returns `NaN` for non-finite numeric input
Probe: `suggestNextWpm(NaN,80) => NaN`. Contract requires integer with floor 60. `null`/missing input is safe (`suggestNextWpm` returns 60 via the typeof guard, which is the realistic data-model path since §4 records use `comprehensionPct:null`), so this only triggers on corrupt data. One-line hardening: use `Number.isFinite` instead of `typeof === 'number'` in the guard.

### F4 — INFO — Negative `wordCount` yields negative WPM
Probe: `wpm(-300,60000) => -300`. Contract says "0 on invalid/zero elapsed" without defining invalid; a negative count is unreachable through the tokenizer path, so this is caller-contract at most. No change required.

### F5 — INFO — Trend half-split ignores the middle session for odd n
For n=5, `half = floor(5/2) = 2` and the middle session is excluded from both halves. Contract is silent (only "flat when n<4"); behavior is deterministic and reasonable. No change required.
