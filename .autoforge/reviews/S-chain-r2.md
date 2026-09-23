# S-chain re-review r2 — three blockers + two notes

Date: 2026-09-23 · Reviewer: autoforge-reviewer (read-only) · Scope: RS3, RS5, RS6, RS1-note, RS3-note

## Evidence

**Gate 1 — walkthrough:** `node .autoforge/validation/e2e-walkthrough.mjs` →
`39 passed, 0 failed -> GO` (e.g. `PASS redesign: margin rail renders one tick per session — ticks=3`, `PASS redesign: log rows read as laps with paired delta — Lap 1`, `PASS privacy: zero external/telemetry network requests`). Report: `.autoforge/validation/e2e-report.json`.

**Gate 2 — unit:** `node --test` → `ℹ tests 109 / ℹ pass 109 / ℹ fail 0`.

**Static quotes**
- RS3: `src/ui/player-view.js:7  import { splitSentences as splitSentencesLib } from '../lib/text.js';` — call sites only at lines 297/322; no `function splitSentences(` anywhere in `player-view.js` (sole definition: `src/lib/text.js:86`).
- RS5: `styles/app.css:147 .dashboard-best { border-bottom: 2px solid var(--marker); font-weight: 600; }`, `:148 .dashboard-delta-up`, `:149 .dashboard-delta-down`; applied at `src/ui/dashboard.js:69` (`dashboard-best`) and `:73` (`dashboard-delta-up|down`).
- RS6: `styles/app.css:175 .player-rail .rail-tick-new { animation: tick-in var(--dur-tick) var(--ease-calm) both; }`, `:151 .quiz-status { transition: opacity var(--dur-status) var(--ease-calm); }`, `:150 .dashboard-suggestion { animation: view-rise var(--dur-view) var(--ease-calm); }`. Logic: `player-view.js:332-343` — `const hadTicks = rail.childElementCount > 0;` … `' rail-tick-new'` only when `hadTicks`; `mark.style.animationDelay = \`${index * 30}ms\`` only when `hadTicks`. Reduced-motion media query disables it for `.player-rail .rail-tick` (matches the extra class).
- RS1 note: `styles/app.css:45-49 header nav button[aria-current="true"] { border-color: var(--iron); border-bottom: 3px solid var(--marker); font-weight: 600; }` — underline marker only, no marker background. `src/app.js:43` sets `aria-current`.
- RS3 note: `player-view.js:76 makeSelect('Text size', …)`, `:77 makeSelect('Text align', …)`, `:86 makeSelect('Calm mode', …)`.

**In-page probe (CDP 9381, server 8151, fresh profile, seeded session)**
- First open of a text: ticks rendered with classes `rail-tick best` / `rail-tick`, `delay: ""` — **no `rail-tick-new`**, no stagger.
- Second open (re-render with rail already populated): every tick `rail-tick … rail-tick-new` with `delay: "0ms"`, `"30ms"`, `"60ms"`, `"90ms"` — 30ms stagger confirmed.
- Dashboard render: `bestText: " · best"`, computed `bestBorderBottom: "2px solid rgb(255, 221, 51)"` (= `--marker`), `bestFontWeight: "600"`; `deltaClass: "dashboard-delta-down"`, `deltaColor: "rgb(130, 133, 138)"`.
- Active nav: computed `background: rgb(255, 255, 255) none …` (no marker fill), `borderBottom: "3px solid rgb(255, 221, 51)"`.

## Verdicts

| Item | Verdict | Basis |
|---|---|---|
| RS3 — player-view uses lib splitSentences, local splitter gone | **FIXED** | import line 7; no local definition; 109/109 tests |
| RS5 — `.dashboard-best` / `.dashboard-delta-*` CSS exists and applies | **FIXED** | CSS 147-149 + dashboard.js 69/73; computed `2px solid rgb(255,221,51)` on best row, delta class/color live |
| RS6 — tick draw-in only post-initial + 30ms stagger; quiz-status fade; suggestion rise | **FIXED** | `hadTicks` gate in renderRail; probe: first render no `rail-tick-new`, re-render all new with 0/30/60/90ms; CSS 150-151 |
| RS1 note — active nav text not on marker | **FIXED** | nav uses 3px marker underline, computed background is not `--marker` |
| RS3 note — setup labels Text size / Text align / Calm mode | **FIXED** | player-view.js 76/77/86 |

**Overall: APPROVED**

## Findings (≤5)

1. All acceptance gates green: walkthrough `39 passed, 0 failed -> GO`; `node --test` `pass 109 / fail 0`.
2. RS6 verified at runtime, not just statically: initial render classes `rail-tick best`/`rail-tick` with empty `animationDelay`; subsequent render classes all `rail-tick-new` with exact 30ms-per-index delays — matches spec.
3. RS5 verified rendered: `.dashboard-best` computed `border-bottom: 2px solid rgb(255, 221, 51)` and delta cells carry `dashboard-delta-up|down` with distinct colors.
4. RS1/RS3 notes verified: nav marker is an underline (no marker background on active text); all three settings labels present.
5. Environment note (not an app defect): orphaned probe Chrome processes from two earlier failed probe attempts polluted the fresh-profile session count during probing; they were killed after the final run. Tick-class and style assertions are unaffected (same-browser sequential observations).

Read-only: no source files modified. Probe script lived in the OS temp dir only.
