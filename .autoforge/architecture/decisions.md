# Architecture Decisions — SpeedReading Trainer (run 002)

Format: one ADR per decision (context / decision / consequence). Citations: `discovery` = `.autoforge/discovery/report.md`; `grilling` = `.autoforge/requirements/grilling.md`; `tracker` = `.autoforge/discovery/tracker-index.md`.
Run 001 ADRs (1–10) preserved verbatim below; run 002 appends ADR-11–20 (§7) + interface freezes (§8) + data-model deltas (§9) + file ownership map (§10) + traceability (§11). Full rationale: `architecture/report.md`.

## 1. ADRs (run 001, preserved)

### ADR-1 Stack: no-build vanilla ES modules
- Context: ~5 views, one timer, one storage wrapper; must run offline with no backend; acceptance requires browser-validatable, no telemetry (grilling:19,62-65); orchestrator default is no-build vanilla.
- Decision: static site — one `index.html`, plain ES modules under `src/`, one CSS file. No bundler, no framework, no npm runtime dependencies. Pure logic modules must be importable by `node --test` with no DOM at import time.
- Alternatives: Vite+React (rejected: build step, dependency weight, trivial state); Vite+vanilla TS (rejected: toolchain for no benefit); single-file inline script (rejected: untestable).
- Consequence: run requires a static server because Chromium blocks module loading over `file://` (`python3 -m http.server 8080`, documented in README). Deploy = copy directory to any static host. DOM code is manual; tests live at `test/*.test.js` and need no loader.

### ADR-2 Storage: IndexedDB only, one wrapper
- Context: books are multi-MB; localStorage caps near 5MB; settings are tiny; export/import requested as maybe (orchestrator brief).
- Decision: single store module over IndexedDB. DB `speedread`, version 1, object stores: `texts`, `quizzes`, `sessions`, `settings`. Export = `{schemaVersion: 1, texts, quizzes, sessions, settings}` JSON; import validates `schemaVersion` and replaces data after confirm.
- Alternatives: localStorage only (rejected: quota); split localStorage/IDB (rejected: two codepaths, no benefit).
- Consequence: storage is async everywhere; Node unit tests skip it (thin code, smoke-tested via acceptance walkthrough). No PII by construction: no accounts, no telemetry, no network calls (grilling:62-65). First upgrade hook point is `onupgradeneeded`.

### ADR-3 EPUB: in MVP, isolated, browser-native, cuttable
- Context: EPUB import is in MVP (grilling:36); a direct dependency is disallowed by the no-build/no-deps default; only text extraction is needed, not rendering.
- Decision: `zip.js` reads the central directory and inflates entries with `DecompressionStream('deflate-raw')`; `epub.js` reads `META-INF/container.xml` -> OPF -> spine -> XHTML, strips markup per chapter. Supported: ZIP method 0 (store) and 8 (deflate), UTF-8/ASCII, non-encrypted, non-ZIP64. Everything else throws `UnsupportedFormatError` with a readable reason. EPUB must never silently produce empty/garbled text.
- Alternatives: demote to v2 (kept as the cut fallback); npm epub/jszip (rejected: dependency + unnecessary renderer).
- Consequence: two extra pure modules (~200 lines total) with fixture-based Node tests (fixture built with `node:zlib`). `ingest()` returns the same shape for TXT and EPUB, so cutting EPUB later touches no other module. Acceptance gate: one real DRM-free Gutenberg EPUB imports with correct chapter count and readable text.

### ADR-4 Quiz: seeded heuristic cloze, user-editable, no external API
- Context: comprehension must be measured per text without LLM APIs or authoring burden (grilling:13,18).
- Decision: `generateQuiz(text, opts)` blanks content words in mid-length sentences; distractors are other content words from the same text; deterministic via a seeded PRNG (seed stored on the quiz). Quiz is editable in the UI before saving. `scoreQuiz` normalizes (lowercase, trim, strip punctuation) and accepts any entry of `accepted[]`.
- Alternatives: fixed question bank (rejected: only works for bundled samples); LLM generation (rejected: non-goal, network, privacy).
- Consequence: quiz quality is a documented limitation, surfaced in UI copy ("auto-generated; edit before use"); comprehension is presented as a trend with WPM, never as an absolute score.

### ADR-5 Timing: rAF + wall-clock deadline, pause when hidden
- Context: chunk timing must not drift; background-tab throttling exists; engine must be unit-testable.
- Decision: `player.js` schedules with `requestAnimationFrame` and computes each chunk's deadline from `now()` (`performance.now()` injectable). No accumulated frame deltas. On `visibilitychange -> hidden` the player pauses; playback never attempts to "catch up" through hidden time.
- Alternatives: `setTimeout` chain (rejected: clamp + drift); Web Worker timer (rejected: complexity for a case we forbid by pausing).
- Consequence: `nextDelay(chunk, wpm)` and the engine's state transitions are tested with a fake clock in Node; the browser adapter is ~15 lines. If real-browser drift is ever measured as unacceptable, the only change is swapping the scheduler behind the same interface.

### ADR-6 Testing: `node --test` for lib, browser walkthrough for DOM/IDB
- Context: no build, no runtime deps, pure modules separated from DOM (orchestrator brief).
- Decision: every `src/lib/*.js` module (except `store.js`) has a `test/<name>.test.js` runnable with `node --test`. `store.js`, `ui/*`, and `app.js` are exercised by a scripted browser acceptance walkthrough (import sample TXT -> calibrate -> play -> quiz -> dashboard -> reload -> data persists).
- Alternatives: Jest/Vitest (rejected: dependency + config); jsdom (rejected: not needed once DOM is confined to `ui/`).
- Consequence: tests run with zero installs (`node --test test/`); CI, when it exists, is one command.

### ADR-7 Accessibility: dual-mode presentation, accessibility wins ties
- Context: RSVP auto-play is inherently visual; grilling:17 requires WCAG 2.2 AA basics, reduced motion, keyboard, screen-reader story; a11y is escalation gate 4 (grilling:50).
- Decision: two presentation modes over the same chunk data. (1) RSVP auto-play: visual region `aria-hidden` decorative; `role="status"` announcements at sentence boundaries only; all controls real buttons with labels; Space/arrows/+/- shortcuts; focus visibly outlined. (2) Screen-reader / reduced-motion mode: sentence-at-a-time manual advance with `aria-live="polite"`, or full-text view; auto-advance defaults off when `prefers-reduced-motion: reduce`. Contrast tokens checked at 4.5:1 minimum.
- Alternatives: announce every chunk (rejected: unusable speech rates); RSVP-only with a disclaimer (rejected: fails gate 4).
- Consequence: `a11y.js` owns reduced-motion detection, announcements, and focus helpers; the player exposes `step()` so mode 2 reuses the engine without timers.

### ADR-8 Chunk policy: default 2 words, fixed per session, 3-word experimental
- Context: evidence supports 1-2 words with 3-word exploratory (discovery:44-46,78-81; grilling:14, gate 3).
- Decision: `chunk(tokens, {size})` with `size ∈ {1,2,3}`, default 2. Hard rules: never merge across paragraph boundaries; a sentence-final punctuation token ends its chunk; a token longer than 14 characters occupies its own chunk. The UI exposes 3 only under an "experimental" toggle. No per-word complexity model in MVP.
- Alternatives: per-chunk complexity heuristics (rejected: speculative, untestable in MVP); fixed 1-word only (rejected: ignores parafoveal evidence).
- Consequence: deterministic, table-testable chunking; changing the policy later is a one-module change. 3-word results are labeled experimental in the dashboard.

### ADR-9 Adaptive WPM: between sessions only
- Context: grilling:14 wants adaptive rate but flags disruption risk to comprehension tracking.
- Decision: within a session WPM changes only by explicit user action. Between sessions, the dashboard may propose a next-session target WPM from last session's comprehension % (rules: >=80% -> +10%, <60% -> -10%, else hold) as a suggestion the user accepts. No silent changes.
- Alternatives: continuous in-session adaptation (rejected: confounds comprehension measurement in MVP); none at all (rejected: progressive overload is in scope).
- Consequence: small pure function in `metrics.js`; adaptation logic fully unit-tested; comprehension data stays interpretable.

### ADR-10 Privacy and copyright posture
- Context: no backend; no telemetry; DRM-free only (discovery:52-57; grilling:16,18,42).
- Decision: the app performs zero network requests after load; no analytics; no accounts; sample text is public domain; import screen states the user must have rights to the text and that DRM-protected files are unsupported (there is no code path that attempts circumvention). Export/import JSON gives users ownership of their data.
- Alternatives: opt-in telemetry (rejected: not needed for MVP, violates default posture).
- Consequence: can be verified at acceptance by watching the network panel (zero requests) — included in the browser walkthrough.

## 2. Module boundaries (run 001, unchanged)

Invariant: `src/lib/` never imports from `src/ui/`, never touches `document`/`window` at import time, never calls `fetch`. `store.js` is the only IndexedDB user; `player.js` is the only timer owner; `orp.js` is the only module with ORP constants; `zip.js` is the only ZIP parser.

## 3. Interface sketch (run 001; deltas in §8)

Unchanged from run 001 except §8 additions. `nextDelay`, `generateQuiz`/`scoreQuiz`, store `exportAll`/`importAll`, and the `a11y.js` surface are frozen.

## 4. Data model (run 001; deltas in §9)

Records `texts`/`quizzes`/`sessions`/`settings` per §9 base shapes. No names, emails, locations, or device identifiers are collected.

## 5. Key risks (run 001, retained)

EPUB correctness; a11y gate; quiz validity; timing drift/background; copyright UX; overclaim risk. Run-002 risks appended in §7 (ADR-11–20 consequences) and report.md §10.

## 6. MVP file list (run 001; run-002 additions in §10)

## 7. New ADRs (run 002)

### ADR-11 Chapter picker: state in composition root, additive attribution
- Context: `app.js` auto-picks first 50+ word chapter; no chapter UI; sessions/quizzes unattributed (F01).
- Decision: chapter state stays in `app.js` (`currentChapter`); existing open/play/record path re-runs with chosen chapter. Session += `chapterIndex, chapterTitle`; quiz += `chapterIndex`. Quiz generation stays chapter-scoped. `textId` remains the dashboard grouping key; records lacking chapter fields render "unknown", never filtered.
- Consequence: no migration, no store change, dashboard/summarize untouched. Risk carried: attribution drift → single-source `currentChapter` + jump-attribution test.

### ADR-12 Quiz authoring: second mode in quiz-view, in-place + edited flag
- Context: `edited` flag exists but always false; no authoring surface (F02). Alternatives: new view+route (rejected: doubles quiz lifecycle for one boolean); parallel copy record (rejected: same reason).
- Decision: `quiz-view.js` gains `renderAuthoring` (edits `answer`/`accepted`, sets `edited:true`) beside `renderAnswering` (writes only `userAnswer`, never reads `accepted`). `scoreQuiz` reused unchanged.
- Consequence: answering-DOM exclusion test (no expected strings in DOM/storage pre-save); review rule: answering path must not reference `q.answer`/`q.accepted`.

### ADR-13 WPM active-time: pure `activeMs` in metrics.js
- Context: cap logic inline in `app.js:100-107`, correct by inspection only (F03). Alternatives: clock-injected service (rejected: one caller, hypothetical seam).
- Decision: `activeMs(events:[{at,expectedMs}])->ms`, per-gap `min(gap, expectedMs*4+250)` — today's formula, cap values frozen. `app.js` collects events per `chunk` emission (using `nextDelay` at emission time) and calls it at session end.
- Consequence: equivalence test (uninterrupted ≡ sum of expected ± rounding) locks happy-path behavior; edge tests (pause, hidden-tab, mid-session WPM change, empty/single) pin the rest.

### ADR-14 Quiz regression fixture lives in tests, blocks silently-degrading tweaks
- Context: quiz tests use synthetic text only; real-prose quality judged once manually (F04). Alternatives: `assets/` sample (rejected: new load path, ADR-10 posture).
- Decision: public-domain excerpt (~150–250 words) inline in `test/quiz-regression.test.js`, fixed seed, exact-output + stopword/distractor/seed-sensitivity asserts.
- Consequence: generator changes that move the fixture fail the suite until the diff is deliberately updated and reviewed as a quality judgment.

### ADR-15 E2E round-trip vs failure-hardening split (F05/F07 overlap line)
- Context: F05 and F07 both touch export/import/store evidence; double-ownership risk.
- Decision: F05 owns UI round-trip + dialogs (export→wipe→import with confirm-accept/dismiss, wrong-schema negative) in the browser harness. F07 owns simulated failure units (quota, abort, malformed payload) against the store contract + recovery copy via existing alerts. Quota/abort = F07 only; schema-mismatch = F05 only; both assert data-intact. No schema change.
- Consequence: no merge collision, no duplicated failure scaffolding.

### ADR-16 SR/keyboard: automate attributes, reserve ears for humans (F06)
- Context: automation covers ARIA/focus/contrast; no human SR pass exists; ticket is `ready-for-human`.
- Decision: automatable slice = scripted key-event walk + focus/announce assertions in `test/harness/` + walkthrough (agent-executable). Human-only slice = real SR listening + keyboard-only full loop with trap notes (F06 stays `ready-for-human`).
- Consequence: F06 is not blocked on automation; automation never claims to verify announcement quality.

### ADR-17 Perf: out-of-gate harness, fix-only-on-miss (F08)
- Context: import-time tokenize/chunk cost unmeasured for 130k-word books. Alternatives: in-suite perf test (rejected: slows `node --test`); workers/virtualization now (rejected: speculative without a miss).
- Decision: standalone node script (explicit run) + in-browser import timing via walkthrough harness. Initial budgets: Node < 2s, browser import < 3s with responsive first paint, chunk-array heap < 100MB — verdict recorded in-ticket. Miss → fix with before/after numbers; pass → zero code change.
- Consequence: permits the no-code outcome; `chunk`/`tokenize` contracts frozen unless a miss forces change.

### ADR-18 Span drill: mode in player-view, gate-5 copy guardrails (F10)
- Context: span work exists as prose framing only; evidence grade moderate → ship framing, not promises. Alternatives: new view + drill module (rejected: one consumer, hypothetical seam).
- Decision: drill mode inside `player-view.js` reusing chunk/ORP/engine; preview width varies, anchor fixed; recognition checks reuse scoring semantics; sessions carry optional `drill:'span'` (dashboard/summarize unchanged). Copy rule: no speed-gain promises anywhere (grep-blocked: `faster`, `boost`, `double`, `improve your speed`); drill comprehension labeled as recognition checks with `drill` flag visible.
- Consequence: overclaim gate stays green by construction; no new data pipeline.

### ADR-19 Redesign build: frozen spec + B interfaces + sequential S-chain
- Context: 10 tickets (RB1–RB3 parallel, RS1–RS7 chained) landing a frozen redesign without behavior regressions.
- Decision: spec authority = `design/tokens.md` + `design/architecture.md` + `design/pass-3-*.md` (pass-3 wins conflicts, tokens.md wins values). B interfaces frozen: `h(tag,attrs,...children)` in `src/ui/h.js`; `splitSentences(text)->string[]` in `src/lib/text.js`; `sessionTicks(sessions)->{wpm,comprehensionPct,best}[]` in `src/lib/metrics.js`; `styles/tokens.css` (`:root` only) + `styles/app.css` (consumes only). S-chain strictly sequential per `blocked_by`; each ticket owns named `app.css` sections only (§10). Rejected (upheld): player-view split, settings module, router module.
- Consequence: `h()` earns its seam (4 view adapters, S2–S5); splitter/ticks earn theirs (SR mode + rail/strip + tests). No ADR-1/6/7 conflicts.

### ADR-20 Release: verify-then-push, Pages timing
- Context: push to `main` auto-redeploys Pages; S7 is verification + release (RS7).
- Decision: push only after suite green + extended e2e green + independent review APPROVED; live-URL check after push; zero feature work in S7.
- Consequence: deploy-timing risk contained; S7 stays a gate, not a work ticket.

## 8. Module interface freezes (run 002 deltas)

```js
// src/lib/metrics.js  (ADR-13, ADR-19)
activeMs(events: [{at:number, expectedMs:number}]) -> number  // per-gap min(gap, expectedMs*4+250); [] -> 0
sessionTicks(sessions) -> [{wpm, comprehensionPct, best}]     // best = argmax wpm, ties -> first

// src/lib/text.js  (ADR-19)
splitSentences(text: string) -> string[]  // abbreviation-aware (Mr/Mrs/Ms/Dr/St…); '' -> []

// src/ui/h.js  (ADR-19, new module)
h(tag: string, attrs?: {class?: string, on?: {[event]: handler}, ...attr}, ...children) -> Element

// src/ui/quiz-view.js  (ADR-12)
renderAnswering(quiz)  // MUST NOT reference q.answer / q.accepted (tested)
renderAuthoring(quiz)  // MAY edit answer/accepted; sets edited:true on save

// styles/  (ADR-19)
styles/tokens.css  // :root custom properties ONLY (grep-enforced); values frozen in design/tokens.md
styles/app.css     // consumes tokens; defines no new custom properties (until S-chain owns sections)
```

Frozen unchanged: `tokenize/chunk`, `orpIndex/orpParts`, `createPlayer/nextDelay`, `generateQuiz/scoreQuiz/normalizeAnswer`, `wpm/comprehensionPct/summarize/suggestNextWpm`, store `exportAll/importAll` shape (`schemaVersion:1`), `a11y.js` surface.

## 9. Data-model deltas (additive only, no migration, DB v1 unchanged)

```js
// sessions += (ADR-11, ADR-18)
{ ..., chapterIndex?: number, chapterTitle?: string, drill?: 'span' }
// quizzes += (ADR-11)
{ ..., chapterIndex?: number }   // edited:boolean already exists (ADR-12 uses it)
```
Missing fields ≡ pre-chapter/undrilled records; readers must default, never filter. Dashboard grouping key stays `textId`.

## 10. File ownership map (run 002)

- F01: `src/app.js` (chapter select + attribution), library/player views (list control only).
- F02: `src/ui/quiz-view.js` (authoring mode) + answering-exclusion test. No new view/route/store.
- F03: `src/lib/metrics.js` (+`test/metrics.test.js`); `src/app.js` call-site only.
- F04: `test/quiz-regression.test.js` only. No app code.
- F05: browser harness + walkthrough extension only. No app/schema change.
- F06: `test/harness/*` scripted checks (agent) + human pass (unchanged ticket). No app redesign.
- F07: browser-context failure tests only; reuses existing alerts. No new dialogs.
- F08: standalone perf script + walkthrough timing. Code change only on measured miss.
- F10: `src/ui/player-view.js` (drill mode) + copy; session `drill` flag producer in `app.js`.
- RB1: `src/lib/text.js` + `src/lib/metrics.js` + tests. RB2: `src/ui/h.js` + tests, zero view edits. RB3: `styles/tokens.css` + `index.html` link order, zero visual change.
- RS1→RS6 sequential; `app.css` section ownership: S1 header/nav, S2 library, S3 player+rail+setup, S4 quiz, S5 dashboard, S6 motion/responsive. S7: verification + push only.

## 11. Ticket traceability (every frontier ticket → decision or no-change line)

F01→ADR-11; F02→ADR-12; F03→ADR-13; F04→ADR-14; F05→ADR-15 (no arch change: harness-only); F06→ADR-16 (no arch change: split only); F07→ADR-15 (no arch change: tests + existing alerts); F08→ADR-17 (no arch change unless miss); F10→ADR-18; RB1/RB2/RB3→ADR-19; RS1–RS6→ADR-19; RS7→ADR-20. No contradiction with ADR-1 (no build/deps: two link tags, no bundler; perf script is plain node) or ADR-10 (zero network, test-only fixtures, no telemetry).
