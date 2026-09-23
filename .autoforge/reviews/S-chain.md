# S-chain review (RS1–RS6) — consolidated, read-only

Date: 2026-09-23 · Reviewer: autoforge-reviewer · Scope: `styles/app.css`, `styles/tokens.css`, `src/ui/{h,library,dashboard,quiz-view,player-view}.js`, `src/app.js`, design docs (`tokens.md`, `pass-3-impeccable.md`, `pass-3-apple.md`), tickets S1–S6 + `work-order.json` M-RS1..M-RS6.
Artifact only; no source mutated.

## 1. Verification runs (real output)

`node .autoforge/validation/e2e-walkthrough.mjs` → `39 passed, 0 failed -> GO`. The six redesign lines:

```
PASS  redesign: body uses the folio token — rgb(246, 244, 236)
PASS  redesign: header material uses backdrop blur — blur(16px) saturate(1.4)
PASS  redesign: margin rail renders one tick per session — ticks=3
PASS  redesign: log rows read as laps with paired delta — Lap 1
PASS  redesign: delta column rendered beside comprehension — delta="—"
PASS  redesign: responsive rail strip + sticky transport at 390px — row/sticky
```

`node --test` → `ℹ tests 109 / ℹ pass 109 / ℹ fail 0 / ℹ skipped 0`.

Note: the walkthrough's only fallback emulation is reduced-motion (`features: [{name:'prefers-reduced-motion', value:'reduce'}]`); reduced-transparency and contrast-more were inspected in CSS only, not emulated.

## 2. Tokens discipline

- `rg -n "^\s*--" styles/app.css` → **no matches (exit 1)**: app.css declares zero custom properties. Consumption: 34 `var(--…)` uses across 16 distinct tokens (`pencil`×6, `iron`×6, `font-display`×4, `folio`×4, `rule`×3, `marker`×2, …).
- Frozen values match `tokens.md`: folio/iron/marker/pencil/rule/oxblood hexes, fonts, motion vars identical (`styles/tokens.css:1-19`).
- Banned craft-floor patterns: no stacked translucency (header `rgba(…,0.72)` and mobile `.player-controls` `rgba(…,0.9)` never overlap — app.css:32-35 vs 201-207); no text on marker **except the active nav** (finding 4); no naked deltas (header `Δ wpm` + same-row WPM/comp, dashboard.js:70-79); no ambient animation beyond view enter + rail tick draw-in (app.css:169-170); chunk changes are motion-free (no animation in `renderChunk`).
- `rg "innerHTML|outerHTML|insertAdjacentHTML|document.write" src/` → none.

## 3. Per-module spot checks

**RS1 (header/nav).** `app.css:27-36` sticky header, `background: rgba(246,244,236,0.72)`, `backdrop-filter: blur(16px) saturate(140%)` — matches `tokens.md:27`. Focus outline preserved (`:focus-visible`, app.css:21-24). Active state: `app.css:45-49` `button[aria-current="true"] { border-color: var(--iron); background: var(--marker); font-weight: 600; }`; `app.js:41-44` sets `aria-current` from the routed view name; nav click routing unchanged (`app.js:368-386`). Fallbacks present (`app.css:182-188`).

**RS2 (shelf).** Empty copy exact: `library.js:115` `'Shelf is empty. Import a book to start training.'` (`tabindex="-1"`, focusable). `h()` used throughout, no imperative `createElement` left in library.js. Behavior flows (file/paste/URL/export/import-JSON/delete+focus) structurally identical to prior revision.

**RS3 (page/rail/setup).** Rail fed by tested mapping: `app.js:117` and `:155` `playerView.renderRail(sessionTicks(await store.getAll('sessions')))`; `metrics.js:95-96` returns `[]` for empty input. Fixed grid anchor: `app.css:77-85` `display:grid; grid-template-columns: 1fr auto 1fr`. Best tick in marker: `app.css:128` `.player-rail .rail-tick.best { background: var(--marker); height: 3px; }`; `renderRail` adds `best` class (player-view.js:342) + title `Lap N: … wpm (best)`. Setup labels: `player-view.js:81-94` — Font / Align / ORP highlight / Chunk size / Reduced motion / Preview drill / Preview words; all persist via `onSettingsChange` (app.js:276-283). Playback/keyboard/announcements untouched; e2e player/drill/a11y checks green.

**RS4 (quiz).** Copy: `quiz-view.js:20` `'Check answers'`; note `:54` `'auto-generated from this text; answers are checked when you save'` (verbatim vs pass-3-impeccable:9); empty `:30` `'No quiz for this text yet.'`. Answering exclusion intact: answering render (`:45-56`) reads only `question.sentence` (line 53) — no `.answer`/`.accepted`; answering submit (`:110-114`) reads only `input.quiz-answer` values, writes `userAnswer`; `q.answer`/`q.accepted` appear only in `startAuthoring` (`:70-88`). e2e re-verified honesty: `quiz: answers are the reader's own (inputs empty, no prefill)` + `wrong answers score 0%`.

**RS5 (log laps).** `dashboard.js:67-69` `Lap ${index + 1}` + best span; `:70-74` WPM/comp/delta cells, `:73-74` delta `${delta >= 0 ? '+' : ''}${delta}` (paired with same-row WPM and labelled `Δ wpm` header, `:99`); `:78` `(experimental)` badge on chunkSize 3; `:12-25` Accept + Dismiss (explicit-only). Summary/export/import/start-session unchanged.

**RS6 (motion/responsive).** Tokens used: `app.css:169` `view-rise var(--dur-view) var(--ease-calm)`, `:170` `tick-in var(--dur-tick) var(--ease-calm)`, `:61` press `var(--dur-press)`. Fallbacks: reduced-motion `:173-181` (animation none, opacity ≤150ms, no transform), reduced-transparency `:182-184` (solid header), contrast-more `:185-188` (1px iron control borders). Responsive `:191-208`: single column, `.player-rail` becomes horizontal strip (`flex-direction: row`, ticks 6×6px), `.player-controls` sticky bottom; e2e verified at 390px (`row/sticky`).

## 4. Adversarial checks (probe output, DOM-stub run)

```
renderRail([]) -> rail children = 0 (no throw)
renderRail(undefined) -> rail children = 0 (no throw)
renderRail(null) -> rail children = 0 (no throw)
renderRail(non-array) -> rail children = 0 (no throw)
renderRail(2) -> children = 2 | classes = rail-tick,rail-tick best | best title = "Lap 2: 400 wpm (best)"
Dismiss -> card.hidden = true | onAcceptWpm calls = 0
first row -> lap = "Lap 1" | best span = true | delta = "—"
h() string child -> nodeType = 3 | text = "<img src=x onerror=alert(1)>"
```

- 0 sessions: empty rail, no crash (`sessionTicks` → `[]`, `renderRail` forEach over `[]`).
- First-row delta is `—` (index 0 → `previous = null` → `delta = null`), matching e2e `delta="—"`.
- Dismiss hides the card and invokes **no** callback (`dashboard.js:20-24`); Accept is the only `onAcceptWpm` caller.
- `h()` is text-safe: string children become `document.createTextNode` (h.js:40-43), injection string rendered inert; no innerHTML family anywhere in `src/`.

## 5. Findings

1. **[RS3 · blocking]** SR mode does not consume the tested lib splitter. `player-view.js:10` still defines a local naive `splitSentences` (`/(?<=[.!?])\s+/`), used at `:302` and `:327`; `src/lib/text.js:86` exports the abbreviation-aware version and **only tests import it** (`rg "splitSentences" src/ tests/` → no src consumer of the lib version). Ticket S3 checklist item "SR mode consumes lib `splitSentences`" is unmet. Fix: import `splitSentences` from `../lib/text.js`, delete the local copy.
2. **[RS5 · blocking]** Best lap is not "in marker": `dashboard.js:69` emits `span.dashboard-best` but `app.css` has no `.dashboard-best` rule (selector count 0) — renders as plain text ` · best`. Spec: pass-3-impeccable:10 "best in marker"; pass-2-frontend:62 "signal dot on the current/best lap". Also `.dashboard-delta-up/-down` are emitted (`dashboard.js:73`) with no CSS rules. Fix: add marker signal (dot/swatch; not marker-colored text — contrast), optionally style deltas.
3. **[RS6 · blocking]** Frozen motion table partially unimplemented: no 30ms stagger on tick draw-in (`app.css:170` sets no delay; `renderRail` sets none), no quiz status 150ms cross-fade (no `.quiz-status` rule), no suggestion-card opacity+4px rise 180ms (no animation on `.dashboard-suggestion`), and the tick animation also fires on initial rail render, not "session save only" (pass-3-apple:9). Fix: add delays/animations and extend the reduced-motion block (`app.css:173-181`) to cover them.
4. **[RS1 · note]** Active nav puts text on marker: `app.css:47` `background: var(--marker)` behind the button label, vs pass-1-apple:31 / pass-1-frontend:25 / craft floor (pass-3-impeccable:24) "marker never carries text … iron 600 +0.01em over blur". Contrast is fine; rule deviation only.
5. **[RS3 · note]** Player view is not `h()`-migrated (no `h` import; `document.createElement` at player-view.js:29-143) though ticket S3 says "h() migration" (orchestrator brief scoped `h()` to library/dashboard/quiz, so treated as note). Setup block labels also diverge from pass-3 ("Speed stepper, Text size, Chunk size, Calm mode" vs current Font/Align/ORP/Chunk/Reduced motion/Preview drill/Preview words; speed only via transport −/+).
6. **[RS2 · note]** Empty invitation sits in the list after the paste/URL boxes (`library.js:109-116`), not "adjacent to the import control" (header) as S2/pass-3-impeccable:7 state. Copy and `h()` usage otherwise exact.

## 6. Verdicts

| Module | Verdict | Basis |
|---|---|---|
| RS1 header/nav | APPROVED_WITH_NOTES | material/aria-current/fallbacks verified; finding 4 |
| RS2 shelf | APPROVED_WITH_NOTES | copy + h() + flows verified; finding 6 |
| RS3 page/rail/setup | CHANGES_REQUIRED | finding 1 (unmet ticket item); notes 5 |
| RS4 quiz | APPROVED | copy verbatim, exclusion grep clean, honesty re-verified |
| RS5 log laps | CHANGES_REQUIRED | finding 2 (best not in marker) |
| RS6 motion/responsive | CHANGES_REQUIRED | finding 3 (motion table gaps) |
| **Overall** | **CHANGES_REQUIRED** | 3 localized fixes (one import swap, CSS rules + delays); e2e 39/39 and `node --test` 109/109 green — no functional regression found |
