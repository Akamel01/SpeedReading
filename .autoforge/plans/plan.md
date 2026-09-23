# Plan — run speedreading-002 "close all tickets" (v2.1, critic fixes incorporated)

Scope: `/Users/akamel/Documents/SpeedReading`. Authority: `.autoforge/discovery/tracker-index.md` (19 frontier entries),
`.autoforge/architecture/decisions.md` ADR-11..20 (§7), interface freezes (§8), data-model deltas (§9), ownership map (§10), traceability (§11).
Fallback (NOT planned, resolved): deploy-imports 01–07 resolved 2026-09-23 (Resolution sections, `.scratch/speedreading-deploy-imports/map.md`);
redesign 01–11 resolved (`.scratch/speedreading-redesign/map.md`); followups-09 paste-text-import superseded by deploy-imports/03
(note in `.scratch/speedreading-followups/issues/09-paste-text-import.md` Comments). No module for these.

Critic review `.autoforge/reviews/plan-002.md` verdict CHANGES_REQUIRED → all 9 findings incorporated here (real filenames,
harness-based acceptance for DOM modules, no shared-file parallel groups, true blocked_by edges, frozen design paths,
runnable harness commands, RS7 gate semantics). Auto-approved: everything resolvable from evidence, no §16 gate.

## Modules (20 modules / 19 tickets; F06 split per ADR-16)

### M-F01 chapter-picker (F01, ADR-11)
- Objective: chapter select in `app.js` (`currentChapter`), sessions += `chapterIndex,chapterTitle`, quizzes += `chapterIndex`, chapter-scoped generation, `textId` stays grouping key, missing fields render "unknown".
- Inputs: followups `01-chapter-picker.md`, decisions.md §8–§9.
- Outputs: `src/app.js`, `src/ui/library.js` (list control only).
- touches: [`src/app.js`, `src/ui/library.js`]
- blocked_by: [M-F03] (shared `src/app.js` serialization; tracker says none)
- Acceptance: walkthrough step (CDP): multi-chapter fixture EPUB import → open chapter 2 → play → quiz → exported session carries chapterIndex 1 + chapterTitle; legacy unattributed record renders "unknown". No node test (DOM-bound, ADR-6).
- Skills: [`tdd`]. Reviewer: agent.

### M-F02 quiz-authoring (F02, ADR-12)
- Objective: `renderAuthoring` beside `renderAnswering` in quiz-view; authoring edits `answer`/`accepted`, sets `edited:true`; answering writes only `userAnswer`; `scoreQuiz` unchanged.
- Inputs: `02-quiz-authoring-mode.md`, §8 freeze.
- Outputs: `src/ui/quiz-view.js`, `test/harness/quiz-authoring.html`.
- touches: [`src/ui/quiz-view.js`, `test/harness/quiz-authoring.html`]
- blocked_by: []
- Acceptance: harness page in headless Chromium (authoring persists edited:true; answering DOM has no expected strings) + grep `renderAnswering` free of `q.answer`/`q.accepted` + `node --test test/quiz.test.js` green (scoring unchanged).
- Skills: [`tdd`]. Reviewer: agent (answering path must not reference expected strings).

### M-F03 wpm-active-time (F03, ADR-13)
- Objective: pure `activeMs(events)->ms` in metrics.js (per-gap `min(gap, expectedMs*4+250)`); `app.js` collects events per `chunk` emission via `nextDelay`, calls at session end.
- Inputs: `03-wpm-active-time-unit.md`, §8 `activeMs` freeze.
- Outputs: `src/lib/metrics.js`, `test/metrics.test.js`, `src/app.js` (call-site only).
- touches: [`src/lib/metrics.js`, `test/metrics.test.js`, `src/app.js`]
- blocked_by: [M-RB1] (shared `src/lib/metrics.js` + test file; RB1 lands `sessionTicks` first, F03 appends — append-only, no rewrites)
- Acceptance: `node --test test/metrics.test.js` (equivalence uninterrupted ≡ Σ expected ± rounding; pause/hidden/WPM-change/empty/single cases).
- Skills: [`tdd`]. Reviewer: agent.

### M-F04 quiz-regression (F04, ADR-14)
- Objective: inline public-domain excerpt 150–250w in test, fixed seed, exact-output + stopword/distractor/seed-sensitivity asserts. No app code.
- Inputs: `04-quiz-regression-lockin.md`.
- Outputs: `test/quiz-regression.test.js`.
- touches: [`test/quiz-regression.test.js`]
- blocked_by: []
- Acceptance: `node --test test/quiz-regression.test.js`.
- Skills: [`tdd`]. Reviewer: agent.

### M-F05 export-import-e2e (F05, ADR-15)
- Objective: browser-harness round-trip export→wipe→import (confirm-accept/dismiss, wrong-schema negative). Schema-mismatch owned here only; quota/abort excluded (F07). No app/schema change.
- Inputs: `05-export-import-e2e.md`.
- Outputs: `test/harness/export-import.js` (standalone CDP script, run explicitly), walkthrough extension in `.autoforge/validation/e2e-walkthrough.mjs` (owned by this module only in G0).
- touches: [`test/harness/export-import.js`, `.autoforge/validation/e2e-walkthrough.mjs`]
- blocked_by: []
- Acceptance: standalone script passes headless-Chromium run (round-trip intact, dismiss loses nothing, wrong-schema rejected with data intact) + extended walkthrough green.
- Skills: []. Reviewer: agent.

### M-F06A sr-keyboard-automation (F06 automatable slice, ADR-16)
- Objective: scripted key-event walk + focus/announce-attribute asserts + contrast check. Claims attributes only, never announcement quality.
- Inputs: `06-sr-keyboard-verification.md`.
- Outputs: `test/harness/a11y-checks.js` (standalone CDP script, run explicitly).
- touches: [`test/harness/a11y-checks.js`]
- blocked_by: []
- Acceptance: standalone run passes (Space/arrows/+/- drive player, focus visible on all controls, `role=status` sentence-boundary only, `aria-live=polite` in SR mode, computed contrast ≥4.5:1).
- Skills: [`accessibility`]. Reviewer: agent.

### M-F06H sr-human-gate (F06 human slice, ADR-16)
- Objective: real screen-reader listening + keyboard-only full loop by a human. No agent implementation.
- Inputs: ticket F06, `test/harness/a11y-checks.js` (context only).
- Outputs: `docs/sr-pass-note.md` (human pass record).
- touches: [`docs/sr-pass-note.md`]
- blocked_by: [M-F06A]
- Acceptance: documented human pass (SR name+version, trap notes, verdict). `human_gate: true`. Tracked separately; does NOT block release.
- Skills: []. Reviewer: human (required).

### M-F07 idb-failure-hardening (F07, ADR-15)
- Objective: simulated quota/abort/malformed-payload failure units vs store contract + recovery via existing alerts. No new dialogs, no schema change.
- Inputs: `07-idb-failure-hardening.md`.
- Outputs: `test/harness/idb-failure.js` (standalone CDP script, run explicitly).
- touches: [`test/harness/idb-failure.js`]
- blocked_by: []
- Acceptance: standalone run passes (each fault leaves prior data intact, alert shown, recovery copy offered).
- Skills: []. Reviewer: agent.

### M-F08 large-book-perf (F08, ADR-17)
- Objective: MEASURE FIRST. Standalone node script + in-browser import timing; budgets Node <2s, browser import <3s responsive first paint, chunk-array heap <100MB; verdict recorded in-ticket. Code change ONLY on measured miss.
- Inputs: `08-large-book-perf.md`.
- Outputs: `scripts/perf-large-book.js`, in-ticket verdict note.
- touches: [`scripts/perf-large-book.js`]
- blocked_by: []
- Acceptance: `node scripts/perf-large-book.js` prints timings+heap+PASS/FAIL vs budgets; on PASS zero app diff (`git status --porcelain src/ styles/` empty). `fix_only_on_miss: true`.
- Skills: []. Reviewer: agent.

### M-F10 span-training (F10, ADR-18)
- Objective: drill mode inside player-view reusing chunk/ORP/engine; variable preview width, fixed anchor; recognition checks reuse scoring; sessions carry optional `drill:'span'` (producer in app.js); dashboard/summarize unchanged; copy guardrail grep.
- Inputs: `10-span-training-mode.md`, §8–§9.
- Outputs: `src/ui/player-view.js`, `src/app.js` (drill flag).
- touches: [`src/ui/player-view.js`, `src/app.js`]
- blocked_by: [M-F01] (shared `src/app.js` guard)
- Acceptance: walkthrough drill steps (variable-width preview at fixed anchor, recognition check scores, drill flag visible) + grep `faster|boost|double|improve your speed` over `src/ui/player-view.js` exits nonzero. No node test (DOM-bound, ADR-6).
- Skills: [`tdd`]. Reviewer: agent.

### M-RB1 lib-sentence-ticks (RB1, ADR-19)
- Objective: `splitSentences` in `src/lib/text.js` (abbreviation-aware, `''->[]`) + `sessionTicks` in metrics (`best`=argmax wpm, ties first) + tests. Exact §8 signatures.
- Inputs: `redesign-build/issues/B1-lib-sentence-ticks.md`, §8.
- Outputs: `src/lib/text.js`, `src/lib/metrics.js`, `test/text.test.js`, `test/metrics.test.js`.
- touches: [`src/lib/text.js`, `src/lib/metrics.js`, `test/text.test.js`, `test/metrics.test.js`]
- blocked_by: []
- Acceptance: `node --test test/text.test.js test/metrics.test.js`.
- Skills: [`tdd`]. Reviewer: agent.

### M-RB2 dom-helper-h (RB2, ADR-19)
- Objective: `h(tag,attrs,...children)` in `src/ui/h.js` + structural harness. Zero view edits.
- Inputs: `issues/B2-dom-helper-h.md`, §8.
- Outputs: `src/ui/h.js`, `test/harness/h.html`.
- touches: [`src/ui/h.js`, `test/harness/h.html`]
- blocked_by: []
- Acceptance: `node --check src/ui/h.js` + harness page structural assertions pass in headless Chromium (nesting, attrs, listeners). No node --test (needs document, ADR-6).
- Skills: [`tdd`]. Reviewer: agent.

### M-RB3 tokens-css-split (RB3, ADR-19)
- Objective: `styles/tokens.css` (`:root` only, values ex `.scratch/speedreading-redesign/design/tokens.md`) + `index.html` link order. Zero visual change.
- Inputs: `issues/B3-tokens-css-split.md`, `.scratch/speedreading-redesign/design/tokens.md`.
- Outputs: `styles/tokens.css`, `index.html`.
- touches: [`styles/tokens.css`, `index.html`]
- blocked_by: []
- Acceptance: grep `:root` outside `styles/tokens.css` exits nonzero for new custom props; page renders pixel-same (walkthrough visual check).
- Skills: []. Reviewer: agent.

### M-RS1 header-nav (RS1, ADR-19)
- Objective: header/nav material per pass-3 spec (`.scratch/speedreading-redesign/design/pass-3-*.md`) + active nav state in app routing; owns `app.css` header/nav section only. No phantom views (critic: header-view/app-shell deleted).
- Inputs: `issues/S1-header-nav-material.md`, RB3 tokens, frozen pass-3 artifacts.
- Outputs: `styles/app.css` (S1 section), `src/app.js` (aria-current routing touch).
- touches: [`styles/app.css`, `src/app.js`]
- blocked_by: [M-RB3, M-F10] (tokens + app.js last writer F10 landed first)
- Acceptance: walkthrough step (header/nav matches spec, tokens only, no new custom props; active state visible + focusable) + fallbacks by emulation.
- Skills: []. Reviewer: agent.

### M-RS2 shelf-restyle (RS2, ADR-19)
- Objective: library shelf restyle + `h()` migration; owns `app.css` library section only; behavior identical.
- Inputs: `issues/S2-shelf-restyle.md`, pass-3.
- Outputs: `src/ui/library.js`, `styles/app.css` (S2 section).
- touches: [`styles/app.css`, `src/ui/library.js`]
- blocked_by: [M-RB2, M-RB3, M-RS1, M-F01] (F01 owns same view file; lands first)
- Acceptance: walkthrough (shelf matches spec incl. empty-state invitation; import/open/delete/export/paste/URL flows behave as before).
- Skills: []. Reviewer: agent.

### M-RS3 page-rail-setup (RS3, ADR-19)
- Objective: player+rail+setup; owns `app.css` player/rail/setup sections only. Setup block lives inside player-view (no setup-view.js — critic: phantom deleted).
- Inputs: `issues/S3-page-rail-setup.md`.
- Outputs: `src/ui/player-view.js`, `styles/app.css` (S3 sections).
- touches: [`styles/app.css`, `src/ui/player-view.js`]
- blocked_by: [M-RB1, M-RB2, M-RB3, M-RS2, M-F10] (F10 owns same view file; lands first)
- Acceptance: walkthrough (rail/strip render via `splitSentences`/`sessionTicks`; setup block persists settings; playback/keys/announcements identical).
- Skills: []. Reviewer: agent.

### M-RS4 quiz-copy (RS4, ADR-19)
- Objective: quiz copy/styling; owns `app.css` quiz section only. Must preserve ADR-12 answering/authoring split.
- Inputs: `issues/S4-quiz-copy.md`.
- Outputs: `src/ui/quiz-view.js` (style/copy only), `styles/app.css` (S4 section).
- touches: [`styles/app.css`, `src/ui/quiz-view.js`]
- blocked_by: [M-RB2, M-RB3, M-RS3, M-F02] (F02 owns same file; lands first)
- Acceptance: walkthrough + `node --test test/quiz-authoring.test.js` — replaced: answering-exclusion grep still clean + `node --test test/quiz.test.js` green (no new node file; DOM-bound per ADR-6).
- Skills: []. Reviewer: agent.

### M-RS5 log-lap-rows (RS5, ADR-19)
- Objective: dashboard rows; owns `app.css` dashboard section only.
- Inputs: `issues/S5-log-lap-rows.md`.
- Outputs: `src/ui/dashboard.js`, `styles/app.css` (S5 section).
- touches: [`styles/app.css`, `src/ui/dashboard.js`]
- blocked_by: [M-RB1, M-RB2, M-RB3, M-RS4]
- Acceptance: walkthrough (rows render, grouping key still `textId`) + `node --test test/` green.
- Skills: []. Reviewer: agent.

### M-RS6 motion-responsive (RS6, ADR-19)
- Objective: motion/responsive pass; owns motion/responsive sections; reduced-motion default-off auto-advance preserved (ADR-7).
- Inputs: `issues/S6-motion-responsive.md`.
- Outputs: `styles/app.css` (S6 sections).
- touches: [`styles/app.css`]
- blocked_by: [M-RS5]
- Acceptance: walkthrough (`prefers-reduced-motion` disables auto-advance; responsive breakpoints per spec) + `node --test test/` green.
- Skills: [`accessibility`]. Reviewer: agent.

### M-RS7 green-release (RS7, ADR-20)
- Objective: VERIFICATION + PUSH ONLY. No feature work. Push iff suite green + extended e2e green + independent review APPROVED; live-URL check after push. M-F06H human pass tracked separately and does not gate release (automation covers attributes per ADR-16).
- Inputs: all prior module outputs.
- Outputs: release push record, live-URL check note, walkthrough visual-assertion extension (owned here; F05's round-trip extension landed earlier in G0 — sequential, no collision).
- touches: [`.autoforge/validation/e2e-walkthrough.mjs`]
- blocked_by: [M-F01, M-F02, M-F03, M-F04, M-F05, M-F06A, M-F07, M-F08, M-F10, M-RB1, M-RB2, M-RB3, M-RS1, M-RS2, M-RS3, M-RS4, M-RS5, M-RS6] (release gate over all agent work; F06H excluded by design)
- Acceptance: `node --test test/` green + extended e2e green + review APPROVED recorded + live URL 200 with zero post-load external requests.
- Skills: []. Reviewer: agent.

## DAG / parallel schedule

- G0 (parallel, pairwise disjoint): M-RB2 | M-RB3 | M-F04 | M-F05 | M-F06A | M-F07 | M-F08. Only M-F05 touches the walkthrough in G0. Harness scripts are standalone CDP runners (explicit commands, not `node --test`).
- G1 (parallel, disjoint): M-RB1 | M-F02.
- G2 (strictly sequential app.js chain): M-RB1 → M-F03 → M-F01 → M-F10. test/metrics.test.js append protocol: RB1 writes sessionTicks cases, F03 appends activeMs cases, no rewrites.
- G3 (strictly sequential S-chain): M-RS1 → M-RS2 → M-RS3 → M-RS4 → M-RS5 → M-RS6 → M-RS7. Shared `styles/app.css` with per-ticket section ownership; shared view files serialized by the added F-edges (RS1←F10, RS2←F01, RS3←F10, RS4←F02).
- Critical path: M-RB3 → M-RS1 → M-RS2 → M-RS3 → M-RS4 → M-RS5 → M-RS6 → M-RS7. App.js chain and M-F06H join RS7 as side gates (F06H tracked, non-blocking).
- Interface freeze refs: `activeMs`/`sessionTicks`/`splitSentences`/`h()`/quiz-view split/tokens-`:root`-only per §8 verbatim; frozen-unchanged list untouched; data deltas additive only (§9).

## Coverage check (tracker-index entry → module, exactly once)

F01→M-F01; F02→M-F02; F03→M-F03; F04→M-F04; F05→M-F05; F06→M-F06A+M-F06H (ADR-16 split, only sanctioned doubling);
F07→M-F07; F08→M-F08; F10→M-F10; RB1→M-RB1; RB2→M-RB2; RB3→M-RB3; RS1→M-RS1; RS2→M-RS2; RS3→M-RS3; RS4→M-RS4; RS5→M-RS5; RS6→M-RS6; RS7→M-RS7.
19/19 owned. No module outside tickets + architecture. Sizes: each module ≤3 source files + tests, one worker session.
