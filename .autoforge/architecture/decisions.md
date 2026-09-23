# Architecture Decisions — SpeedReading Trainer

Format: one ADR per decision (context / decision / consequence). Then module interfaces, file tree, MVP file list. Citations: `discovery` = `.autoforge/discovery/report.md`; `grilling` = `.autoforge/requirements/grilling.md`; `tracker` = `.autoforge/discovery/tracker-index.md`.

## 1. ADRs

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

## 2. Module boundaries

Invariant: `src/lib/` never imports from `src/ui/`, never touches `document`/`window` at import time, never calls `fetch`. `store.js` is the only IndexedDB user; `player.js` is the only timer owner; `orp.js` is the only module with ORP constants; `zip.js` is the only ZIP parser.

Touches-ready globs:
- Pure logic + tests: `src/lib/{text,orp,player,quiz,metrics,pipeline,zip,epub}.js`, `test/{text,orp,player,quiz,metrics,pipeline,zip,epub}.test.js`
- Storage: `src/lib/store.js`
- Composition: `src/app.js`
- UI: `src/ui/{library,player-view,quiz-view,dashboard,a11y}.js`
- Shell: `index.html`, `styles/app.css`
- Docs: `README.md`

## 3. Interface sketch (function signatures)

```js
// src/lib/text.js
/** @typedef {{word:string, trail:string}} Token  // trail = punctuation/spaces following the word */
tokenize(text) -> Token[]
chunk(tokens, {size=2, longWordChars=14}) -> Chunk[]   // Chunk = {words:Token[], text:string}
// breaks: paragraph end, sentence-final punctuation, word.length > longWordChars

// src/lib/orp.js  — single source of truth for the ORP rule
orpIndex(word) -> number           // 1-char:0; 2-5:1; 6-9:2; 10-13:3; 14+:4 (clamped to length-1)
orpParts(word) -> {left:string, orp:string, right:string}

// src/lib/player.js — no DOM inside; scheduler and clock are injected
createPlayer({chunks, wpm, now=performance.now, schedule=rAF, adaptiveBetweenSessions=false})
  -> {play, pause, toggle, seek(i), step(+1|-1), setWpm(n), getState, on(event, cb)}
// events: 'chunk'{index, chunk, orpParts}, 'end', 'state'{playing, index, wpm}
nextDelay(chunk, wpm) -> ms        // pure; exported for tests: 60000/wpm * (chunk.words.length===0?1:1)

// src/lib/pipeline.js
normalizeTxt(raw) -> string                          // BOM strip, \r\n -> \n, collapse blank runs
chapterize(text) -> Chapter[]                        // heading heuristics (CHAPTER N / §), fallback 1 chapter
ingest({name, arrayBuffer}) -> Promise<{title, source:'txt'|'epub', chapters:Chapter[]}>
//   dispatches on extension; .txt -> normalize+chapterize; .epub -> epubToChapters; else UnsupportedFormatError

// src/lib/zip.js
readZip(arrayBuffer) -> Promise<Map<string, Uint8Array>>  // throws UnsupportedFormatError on zip64/encrypted/method!=0,8
// src/lib/epub.js
epubToChapters(arrayBuffer) -> Promise<{title, chapters:Chapter[]}>  // container.xml -> OPF -> spine -> XHTML -> text

// src/lib/quiz.js
generateQuiz(text, {n=5, seed, minSentenceWords=8, maxSentenceWords=40})
  -> Question[]   // {id, kind:'cloze', sentence, answer, accepted:string[], candidates:string[]}
scoreQuiz(questions, answers) -> {correct, total, pct, perQuestion:boolean[]}
normalizeAnswer(s) -> string       // lowercase, trim, strip surrounding punctuation, collapse spaces

// src/lib/metrics.js
wpm(wordCount, elapsedMs) -> number
comprehensionPct(correct, total) -> number
summarize(sessions) -> {sessions:n, bestWpm, avgWpm, avgComprehension, trend:'up'|'flat'|'down'}
suggestNextWpm(lastWpm, lastComprehensionPct) -> number   // ADR-9 rules: >=80 -> +10%, <60 -> -10%

// src/lib/store.js — only IndexedDB user; all functions async
openStore() -> Promise<Store>
Store: {put(store, rec), get(store, id), getAll(store), del(store, id), exportAll(), importAll(json)}
// DB 'speedread' v1; stores texts, quizzes, sessions, settings (keyPath:'id'); export {schemaVersion:1,...}

// src/ui/a11y.js
prefersReducedMotion() -> boolean
announce(message, {politeness='polite'}) -> void     // uses one shared live region
focusMain() -> void
```

## 4. Data model (records in IndexedDB)

```js
// texts
{ id, title, source:'txt'|'epub', importedAt, chapters:[{index, title, text, wordCount}], totalWords }

// quizzes
{ id, textId, createdAt, seed, questions:[{id, kind:'cloze', sentence, answer, accepted[], candidates[]}],
  edited:boolean }

// sessions  (baseline is a session with kind:'baseline' — no separate record)
{ id, kind:'baseline'|'read', textId, chunkSize:1|2|3, targetWpm, startedAt, endedAt,
  wordCount, elapsedMs, wpm, quizId:null|string, correct:null|number, total:null|number, comprehensionPct:null|number }

// settings (single record id:'settings')
{ id:'settings', wpm:300, chunkSize:2, orpEnabled:true, adaptiveSuggestions:true,
  reducedMotion:'auto'|'on'|'off', fontScale:1, textAlign:'center' }
```

No names, emails, locations, or device identifiers are collected. The only user content is the imported text and reading results, all local.

## 5. Key risks (carried from report.md §4)

1. EPUB correctness (high) — gate: real Gutenberg file + fixture tests; cuttable per ADR-3.
2. A11y gate (high) — dual mode per ADR-7; escalation gate 4.
3. Quiz validity (medium) — editable, seeded, labeled per ADR-4.
4. Timing drift/background (medium) — wall-clock + visibility pause per ADR-5.
5. Copyright UX (medium) — copy + no DRM code path per ADR-10.
6. Overclaim risk (medium) — peripheral/perceptual-span framed as calibration path (report.md §5).

## 6. MVP file list (build order)

1. `index.html`, `styles/app.css`
2. `src/lib/text.js`, `test/text.test.js`
3. `src/lib/orp.js`, `test/orp.test.js`
4. `src/lib/player.js`, `test/player.test.js`
5. `src/lib/quiz.js`, `test/quiz.test.js`
6. `src/lib/metrics.js`, `test/metrics.test.js`
7. `src/lib/store.js`
8. `src/lib/pipeline.js`, `test/pipeline.test.js`
9. `src/ui/a11y.js`, `src/ui/library.js`
10. `src/ui/player-view.js`
11. `src/ui/quiz-view.js`, `src/ui/dashboard.js`
12. `src/app.js`
13. `src/lib/zip.js`, `src/lib/epub.js`, `test/zip.test.js`, `test/epub.test.js` (last; cuttable at its gate)
14. `README.md` (run command, privacy statement, glossary, evidence notes)
15. `assets/sample.txt` (public-domain calibration passage)

No build artifacts, no package.json required for the app (tests run via `node --test test/`). No plugin/hooks system, no configuration layer beyond the `settings` record, no interfaces with a single speculative implementation.
