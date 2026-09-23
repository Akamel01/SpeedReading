# Plan — SpeedReading Trainer (greenfield MVP)

## 0. Scope authority

`discovery/tracker-index.md` has **zero ticket entries** (no Wayfinder map, no GitHub repo, no handoff docs). Its Scope Fallback clause makes the stated objective the sole scope authority: build an in-browser trainer that presents books/texts as 1–3 word chunks (RSVP) to train reading + comprehension speed. Therefore modules below are enumerated from `architecture/decisions.md` §6 MVP file list only. No item outside §6 is planned; the non-goals in `grilling.md:37-38` (accounts, cloud sync, DRM handling, PDF, LLM quizzes, mobile app) are excluded.

Budget context: planner ran on a 64k-window conservative model; artifacts are contract-grade and terse.

## 1. Interface freeze (authoritative for all parallel workers)

Signatures are copied verbatim from `decisions.md` §3. Do not change; a worker that needs a change stops and reports.

```js
// src/lib/text.js
/** @typedef {{word:string, trail:string}} Token */
tokenize(text) -> Token[]
chunk(tokens, {size=2, longWordChars=14}) -> Chunk[]   // Chunk = {words:Token[], text:string}
// breaks: paragraph end, sentence-final punctuation, word.length > longWordChars

// src/lib/orp.js
orpIndex(word) -> number           // 1-char:0; 2-5:1; 6-9:2; 10-13:3; 14+:4 (clamped to length-1)
orpParts(word) -> {left:string, orp:string, right:string}

// src/lib/player.js
createPlayer({chunks, wpm, now=performance.now, schedule=requestAnimationFrame})
  -> {play, pause, toggle, seek(i), step(+1|-1), setWpm(n), getState, on(event, cb)}
// events: 'chunk'{index, chunk, orpParts}, 'end', 'state'{playing, index, wpm}
// visibility pause: engine exposes pause(); app.js owns the document 'visibilitychange'
// listener and calls player.pause() — the engine never touches document (critic fix #1).
nextDelay(chunk, wpm) -> ms        // pure: chunk.words.length * 60000 / wpm — a 2-word chunk at 300 wpm displays 400ms, so measured WPM stays accurate (orchestrator fix; supersedes the flat 60000/wpm)

// src/lib/pipeline.js
normalizeTxt(raw) -> string
chapterize(text) -> Chapter[]
ingest({name, arrayBuffer}) -> Promise<{title, source:'txt'|'epub', chapters:Chapter[]}>

// src/lib/zip.js
readZip(arrayBuffer) -> Promise<Map<string, Uint8Array>>
// src/lib/epub.js
epubToChapters(arrayBuffer) -> Promise<{title, chapters:Chapter[]}>

// src/lib/quiz.js
generateQuiz(text, {n=5, seed, minSentenceWords=8, maxSentenceWords=40})
  -> Question[]   // {id, kind:'cloze', sentence, answer, accepted:string[], candidates:string[]}
scoreQuiz(questions, answers) -> {correct, total, pct, perQuestion:boolean[]}
normalizeAnswer(s) -> string

// src/lib/metrics.js
wpm(wordCount, elapsedMs) -> number
comprehensionPct(correct, total) -> number
summarize(sessions) -> {sessions:n, bestWpm, avgWpm, avgComprehension, trend:'up'|'flat'|'down'}
suggestNextWpm(lastWpm, lastComprehensionPct) -> number   // >=80 -> +10%, <60 -> -10%, else hold

// src/lib/store.js  (all async)
openStore() -> Promise<Store>
Store: {put(store, rec), get(store, id), getAll(store), del(store, id), exportAll(), importAll(json)}
// DB 'speedread' v1; stores texts, quizzes, sessions, settings (keyPath:'id'); export {schemaVersion:1,...}

// src/ui/a11y.js
prefersReducedMotion() -> boolean
announce(message, {politeness='polite'}) -> void
focusMain() -> void
```

### 1a. Planner-frozen UI contracts (not in §3; frozen here so views can be built in parallel)

Views are render + event wiring only; `app.js` owns the store and player instances (report.md §3: `app -> ui + lib`).

```js
createLibraryView(root, {onImportFile(file), onOpenText(id), onDeleteText(id), onExport(), onImportJson(json)})
  -> {render(texts)}
createPlayerView(root, {onSessionEnd(session), onExit(), onSettingsChange(partial)})
  -> {start({player, text}), showSrText(text), hide(), renderSettings(settings)}
createQuizView(root, {onSave(quiz), onCancel()})
  -> {start(quiz)}
createDashboard(root, {onStartSession(textId), onExport(), onImportJson(json), onAcceptWpm(n)})
  -> {render({sessions, suggestion})}
```

Player-view owns the settings controls (fontScale, textAlign, orpEnabled, chunkSize incl. experimental 3, reducedMotion override) and reports changes through `onSettingsChange(partial)`; app persists them via store (critic fix #6). Dashboard owns the explicit-accept WPM suggestion button reporting through `onAcceptWpm(n)`.

### 1b. DOM contract — **pinned in this plan** (chosen over "shell first"; shell is additionally in wave 1 so there is no drift)

`index.html` must contain exactly these hooks; views code against them and must not invent new ones:

- `#app` — app root.
- `#view-library`, `#view-player`, `#view-quiz`, `#view-dashboard` — `<section>` per view; inactive ones carry `hidden`.
- `#live-region` — single `aria-live="polite"` node, owned by `a11y.announce`.
- all controls are real `<button>`/`<input>`/`<select>` elements; no click-only divs.
- `styles/app.css` defines color/contrast tokens at ≥4.5:1, focus-visible outline, and exactly these settings variables consumed by views: `--font-scale` (number, default 1) and `--text-align` (default `center`), applied by views via `style.setProperty` on `#view-player` (critic fix #3).
- ORP anchor contract (critic fix #3): a rendered chunk is
  `<div class="rsvp-stage"><span class="rsvp-left">…</span><span class="rsvp-orp">X</span><span class="rsvp-right">…</span></div>`
  with `.rsvp-stage { display:grid; grid-template-columns: 1fr auto 1fr }`, `.rsvp-left { text-align:right }`, `.rsvp-right { text-align:left }` — the ORP character therefore stays at a fixed horizontal x regardless of word length or `--font-scale` ("two font scales" acceptance becomes a measurable visual check).
- Ownership rule: `shell` owns `index.html` + `styles/app.css` + `src/ui/a11y.js` + the contract ids; each view module owns only its own subtree inside its `#view-*` section and may add classes (not ids) there; only `shell` edits `index.html` after wave 1 (critic fix #3/#4).
- `<script type="module" src="./src/app.js">` is the only script tag.

### 1c. Module invariants (violation = review reject)

1. `src/lib/*` never imports `src/ui/*`, never touches `document`/`window` at import time, never calls `fetch`.
2. `store.js` is the only IndexedDB user.
3. `player.js` is the only module owning a timer (`rAF`/`setTimeout`); views never schedule playback.
4. `orp.js` is the only module with ORP constants.
5. `zip.js` is the only ZIP parser; `epub.js` calls it and does not parse ZIP itself.
6. Reader-facing copy frames peripheral/perceptual-span work as a calibration pathway, never a guaranteed speed boost (grilling gate 5).
7. `pipeline.js` reaches EPUB via **dynamic** `await import('./epub.js')` so deleting `zip.js`/`epub.js` leaves the TXT path loadable (ADR-3 cut isolation).

## 2. Modules

Every module lists `touches` (exclusive globs), `blocked_by`, runnable acceptance, skills, reviewer requirement, cuttable flag.

### G1 — wave 1 (all touches disjoint, run same turn)

**M1 `shell`** — static presentation foundation + a11y primitives.
- inputs: `decisions.md` §1 ADR-7, §6.1; `grilling.md:17,44`
- outputs: `index.html`, `styles/app.css`, `src/ui/a11y.js`, `package.json`
- touches: `index.html`, `styles/app.css`, `src/ui/a11y.js`, `package.json`
- blocked_by: none
- acceptance: open `http://localhost:8080/` via `python3 -m http.server 8080` → DOM contract §1b present, correct ids, no console errors; `a11y.prefersReducedMotion()` returns false/true under OS toggle and `announce()` writes into `#live-region`; keyboard-tab reaches every control in the shell; `package.json` is exactly `{"type":"module"}` — no dependencies, no scripts (critic fix #2; makes `node --test` ESM deterministic instead of relying on Node ≥22 syntax detection).
- notes: local Node is v26.7.0 (deflate-raw supported); README pins Node ≥22.7 for contributors.
- skills: frontend-design-direction, accessibility (WCAG 2.2 AA), frontend-a11y. reviewer: required (DOM contract + a11y).

**M2 `lib-text`** — tokenize + chunk policy.
- inputs: ADR-8; `decisions.md` §3
- outputs: `src/lib/text.js`, `test/text.test.js`
- touches: `src/lib/text.js`, `test/text.test.js`
- blocked_by: none
- acceptance: `node --test test/text.test.js` green with cases: never merge across paragraph boundary; sentence-final punctuation ends chunk; token >14 chars own chunk; size ∈ {1,2,3}; default 2; `trail` preserved.
- skills: tdd-workflow, golang-testing patterns not applicable — use tdd-workflow. reviewer: required (policy correctness = ADR-8).

**M3 `lib-orp`** — ORP rule, single authority.
- inputs: ADR-7/§3 ORP table; glossary correction (`report.md` §5)
- outputs: `src/lib/orp.js`, `test/orp.test.js`
- touches: `src/lib/orp.js`, `test/orp.test.js`
- blocked_by: none
- acceptance: `node --test test/orp.test.js` green for boundary lengths 1,2,5,6,9,10,13,14,20 and clamp; `orpParts` concatenation equals input.
- skills: tdd-workflow. reviewer: required.

**M4 `lib-quiz`** — seeded cloze generation + scoring.
- inputs: ADR-4; §3 signatures
- outputs: `src/lib/quiz.js`, `test/quiz.test.js`
- touches: `src/lib/quiz.js`, `test/quiz.test.js`
- blocked_by: none
- acceptance: `node --test test/quiz.test.js` green: same seed → identical quiz; different seed differs; n=5; blanked word appears in `accepted`; `normalizeAnswer` case/punctuation/space normalization; `scoreQuiz` pct + perQuestion; `total=0` returned as 0 pct not NaN.
- skills: tdd-workflow. reviewer: required (correctness of scoring ≥ UI concern).

**M5 `lib-metrics`** — WPM, comprehension, trend, between-session suggestion.
- inputs: ADR-9; §3
- outputs: `src/lib/metrics.js`, `test/metrics.test.js`
- touches: `src/lib/metrics.js`, `test/metrics.test.js`
- blocked_by: none
- acceptance: `node --test test/metrics.test.js` green: wpm(300,60000)=300; elapsedMs=0 guarded; comprehensionPct; summarize trend up/flat/down; suggestNextWpm +10% at ≥80, −10% at <60, hold otherwise; no in-session mutation path (pure).
- skills: tdd-workflow. reviewer: required.

**M6 `lib-store`** — the only IndexedDB wrapper. *(Merged: single file, no test file by ADR-6.)*
- inputs: ADR-2; §3, §4 data model
- outputs: `src/lib/store.js`
- touches: `src/lib/store.js`
- blocked_by: none
- acceptance (critic fix #5 — all runnable, confirm is UI not store): browser console on the served app — `openStore()` then `put/get/getAll/del` round-trip on each of `texts|quizzes|sessions|settings`; `exportAll()` yields `{schemaVersion:1,texts,quizzes,sessions,settings}`; `importAll(json)` returns a documented error object when `schemaVersion !== 1` and otherwise replaces data (the user confirmation dialog is wired by `app` before calling `importAll` — not part of store); `put` rejects (does not silently drop) on quota error with a readable message.
- skills: frontend-patterns (IDB), security-review (local-only guarantees). reviewer: required.

**M7 `epub-import`** — ZIP central directory + EPUB text extraction. `cuttable: true`.
- inputs: ADR-3; §3 `readZip`/`epubToChapters`
- outputs: `src/lib/zip.js`, `src/lib/epub.js`, `test/zip.test.js`, `test/epub.test.js`
- touches: `src/lib/zip.js`, `src/lib/epub.js`, `test/zip.test.js`, `test/epub.test.js`
- blocked_by: none (its Node tests build a fixture in-file with `node:zlib`; the `ingest` dispatch check lives in M15)
- acceptance: `node --test test/zip.test.js test/epub.test.js` green: fixture EPUB (method 0 and method 8) → chapter titles in spine order, text stripped of markup; ZIP64/encrypted/method∉{0,8}/non-UTF-8 → `UnsupportedFormatError` with readable message; never returns empty/garbled text silently.
- Module ≠ session boundary: this worker MAY use two child sessions internally (zip.js+tests, then epub.js+tests) against the frozen `readZip` signature; the DAG is unchanged.
- reviewer: required (high-risk module, ADR-3 gate).

**M8 `docs-assets`** — runnable docs + calibration sample. *(Merged: docs/asset text only, one review unit.)*
- inputs: `grilling.md:61-65`; ADR-10; `report.md` §5 glossary
- outputs: `README.md`, `assets/sample.txt`
- touches: `README.md`, `assets/sample.txt`
- blocked_by: none
- acceptance: README states the run command (`python3 -m http.server 8080`), Node ≥22.7 requirement for `node --test`, the “no build, no server-side, no telemetry, no accounts, zero network requests after load” privacy statement, the corrected glossary (ORP = Optimal Recognition Point), evidence notes, non-goals, the “user must have rights / DRM unsupported” notice, and a 4-week pilot plan (baseline week 1; 3 sessions/week with retention quiz; re-baseline week 4; what to watch: comprehension trend, not WPM alone — critic fix #9); `assets/sample.txt` is public-domain (Shakespeare/public-domain passage), 300–500 words, plain UTF-8.
- skills: documentation. reviewer: required (copy accuracy: overclaim gate).

### G2 — wave 2

**M9 `lib-player`** — timing engine, no DOM, injected clock/scheduler.
- inputs: ADR-5, ADR-9; §3; imports `orp.js` (read-only dependency; does not touch its globs)
- outputs: `src/lib/player.js`, `test/player.test.js`
- touches: `src/lib/player.js`, `test/player.test.js`
- blocked_by: `lib-orp`
- acceptance: `node --test test/player.test.js` green with fake clock: `nextDelay(chunk,wpm) = chunk.words.length * 60000/wpm` (1-word and 2-word cases asserted); play → one `chunk` event per deadline, no accumulated drift; `end` fires once at last chunk; pause stops emissions; `seek`/`step` clamp; `setWpm` applies from next chunk only (no retroactive jump); `getState` reflects playing/index/wpm; hidden-tab pause is a single exposed hook the browser adapter calls (engine test asserts pause-on-hide semantics).
- skills: tdd-workflow, latency-critical-systems (timing). reviewer: required.

**M10 `lib-pipeline`** — TXT normalize/chapterize + `ingest` dispatch.
- inputs: §3; ADR-3 (dynamic EPUB import); ADR-10
- outputs: `src/lib/pipeline.js`, `test/pipeline.test.js`
- touches: `src/lib/pipeline.js`, `test/pipeline.test.js`
- blocked_by: `lib-text`
- acceptance: `node --test test/pipeline.test.js` green: BOM strip, `\r\n`→`\n`, blank-run collapse; chapters detected on `CHAPTER N`/`§` heuristics, else exactly 1 chapter; `.txt` dispatch returns `{title, source:'txt', chapters}`; unknown extension throws `UnsupportedFormatError`; `.epub` path reached only through dynamic import and, when `epub.js` is absent (ADR-3 cut), `.epub` ingest rejects with `UnsupportedFormatError('EPUB support unavailable')` — never a raw `ERR_MODULE_NOT_FOUND` (critic fix #7); module loads cleanly with `epub.js` absent.
- skills: tdd-workflow. reviewer: required.

### G3 — wave 3

**M11 `ui-library`** — import/list/open/delete/export-import view.
- inputs: frozen UI contract §1a, DOM contract §1b; `grilling.md:16`
- outputs: `src/ui/library.js`, `test/harness/library.html`
- touches: `src/ui/library.js`, `test/harness/library.html`
- blocked_by: `shell`
- acceptance: open the module's own harness `test/harness/library.html` on the static server with stub callbacks (harness file is owned by this module — critic fix #4): file input triggers `onImportFile(file)`; `render(texts)` lists title, source, word count; open/delete callbacks fire with correct id; export/import buttons call callbacks; copyright/DRM notice visible; full keyboard operation; focus returns to list after delete.
- skills: frontend-patterns, frontend-a11y, accessibility. reviewer: required.

**M12 `ui-player-view`** — RSVP renderer + SR/reduced-motion mode + settings controls.
- inputs: §1a/§1b; ADR-7; `report.md` §6 keyboard map (Space, ←/→, ↑/↓ or ±, Esc)
- outputs: `src/ui/player-view.js`, `test/harness/player-view.html`
- touches: `src/ui/player-view.js`, `test/harness/player-view.html`
- blocked_by: `shell`, `lib-player`, `lib-orp`
- acceptance: open `test/harness/player-view.html` with a stub player: words render per the §1b ORP anchor contract (`--font-scale` 1 and 1.5, ORP char stays at fixed x); Space/arrows/±/Esc behave per key map; visual region `aria-hidden`, `role="status"` announces at sentence boundaries only; `prefers-reduced-motion: reduce` defaults to sentence-at-a-time mode with `aria-live="polite"` manual advance; focus visibly outlined; `start()` consumes an injected player instance and never creates a timer; settings controls (fontScale, textAlign, orpEnabled, chunkSize incl. experimental 3, reducedMotion override) call `onSettingsChange(partial)` and `renderSettings(settings)` reflects persisted values (critic fix #6).
- skills: frontend-a11y, accessibility, motion-foundations (reduced motion). reviewer: required (a11y gate 4).

**M13 `ui-quiz-view`** — cloze quiz editor/submit. *(Split from merged M13 per critic fix #8; each half is one worker session.)*
- inputs: §1a/§1b; ADR-4; `grilling.md:15`
- outputs: `src/ui/quiz-view.js`, `test/harness/quiz-view.html`
- touches: `src/ui/quiz-view.js`, `test/harness/quiz-view.html`
- blocked_by: `shell`, `lib-quiz`
- acceptance: open `test/harness/quiz-view.html`: quiz shows 5 cloze items, each editable with an “auto-generated, edit before use” label; submit calls `onSave` with edited questions; cancel calls `onCancel`; empty/absent quiz renders an empty state without errors.
- skills: frontend-patterns, frontend-a11y, accessibility. reviewer: required.

**M13b `ui-dashboard`** — progress dashboard + explicit WPM suggestion.
- inputs: §1a/§1b; ADR-9; `grilling.md:15`
- outputs: `src/ui/dashboard.js`, `test/harness/dashboard.html`
- touches: `src/ui/dashboard.js`, `test/harness/dashboard.html`
- blocked_by: `shell`, `lib-metrics`
- acceptance: open `test/harness/dashboard.html`: table shows WPM **and** comprehension % from the same session, trend badge, suggestion button (+10%/−10% per ADR-9) requiring explicit accept → `onAcceptWpm(n)`; 3-word chunk sessions carry an “experimental” label; empty state renders without errors.
- skills: frontend-patterns, frontend-a11y, accessibility. reviewer: required.

### G4 — wave 4

**M14 `app`** — composition root; last, blocked by all views/libs.
- inputs: all frozen interfaces; §1b DOM contract
- outputs: `src/app.js`
- touches: `src/app.js`
- blocked_by: `shell`, `lib-text`, `lib-orp`, `lib-player`, `lib-quiz`, `lib-metrics`, `lib-store`, `lib-pipeline`, `epub-import`, `ui-library`, `ui-player-view`, `ui-quiz-view`, `ui-dashboard`
- acceptance (trimmed per critic fix #8; the full end-to-end walkthrough is M15's job): `node --test test/` all green (proves lib tests unaffected by DOM code) **and** browser seams check on the served app: import `assets/sample.txt` → baseline session recorded (`kind:'baseline'`) → open player, exit back → reload page → text, settings, session persist; exactly one `#view-*` visible at a time; switching tabs mid-playback pauses (visibilitychange → `player.pause()`; critic fix #1) and resuming never fast-forwards hidden time; a user-confirmed JSON import calls `store.importAll` only after confirm.
- skills: frontend-patterns, error-handling. reviewer: required (integration seams).

### G5 — wave 5

**M15 `verify-acceptance`** — acceptance gate, no source edits. *(Not a §6 file; required by grilling gate 4, ADR-3 gate, ADR-10 verification, and the acceptance criteria in `grilling.md:61-65`.)*
- inputs: all outputs; `grilling.md` acceptance list; ADR-3 quality gate
- outputs: `.autoforge/validation/walkthrough.md`
- touches: `.autoforge/validation/`
- blocked_by: `app`, `docs-assets`
- acceptance (each step recorded with observed result in the report file):
  1. Node-level dispatch check: `node --input-type=module -e "const m=await import('./src/lib/pipeline.js'); ..."` on the fixture EPUB → `source:'epub'`, correct chapter count. If EPUB was cut, record ADR-3 fallback and skip.
  2. Real-book gate: import one DRM-free Project Gutenberg EPUB through the UI → correct chapter count + readable text (ADR-3 gate). Cut (per §4) is permitted here as well as at M7 if this fails.
  3. Browser walkthrough: sample TXT import → baseline WPM → RSVP play 1-2 words → quiz → dashboard → reload → persistence.
  4. A11y pass: keyboard-only run of the whole loop; screen-reader mode; `prefers-reduced-motion` default; contrast spot-check (gate 4 — hard stop if failing).
  5. Privacy pass: Network panel zero requests after load; no telemetry/accounts present; grep confirms no `fetch(` in `src/`.
  6. Docs pass: README accuracy vs shipped behavior; overclaim copy check.
- skills: browser-qa, accessibility, verification-loop. reviewer: required (independent of implementers; failure → halt per gate 4).
- cuttable: false (but EPUB steps 1–2 are skippable when M7 is cut).

## 3. Execution work order (DAG)

```text
G1 (8 parallel, touches disjoint):
  shell ──────────────┐
  lib-text ────────┐  │
  lib-orp ─────┐   │  │
  lib-quiz ────┼───┼──┼──┐
  lib-metrics ─┼───┼──┼──┼──┐
  lib-store ───┼───┼──┼──┼──┼──┐
  epub-import ─┼───┼──┼──┼──┼──┼──┐
  docs-assets ─┼───┼──┼──┼──┼──┼──┼──┐
G2:            ▼   ▼  │  │  │  │  │  │
  lib-player (or p) ──┼──┼──┼──┼──┼──┼─┐
  lib-pipeline (text)─┘  │  │  │  │  │ │
G3:                      ▼  ▼  ▼  │  │ │
  ui-library (shell)                │  │ │
  ui-player-view (shell,player,orp) │  │ │
  ui-quiz-view (shell,quiz)         │  │ │
  ui-dashboard (shell,metrics)      ┘  │ │
G4:                                     ▼ │
  app (all)                               │
G5:                                       ▼
  verify-acceptance (app, docs-assets) ◄──┘
```

- **Parallel groups**: G1 = {shell, lib-text, lib-orp, lib-quiz, lib-metrics, lib-store, epub-import, docs-assets}; G2 = {lib-player, lib-pipeline}; G3 = {ui-library, ui-player-view, ui-quiz-view, ui-dashboard}; G4 = {app}; G5 = {verify-acceptance}. Each group is provably touches-disjoint (globs listed per module; no file appears in two modules).
- **Serialization reasons**: `app.js` imports every view/lib → must be last; views import `a11y` and rely on the pinned DOM contract → after `shell`; `lib-player` imports `orp.js` → after `lib-orp`; `lib-pipeline` imports `text.js` → after `lib-text`; verification needs the whole composition → after `app`.
- **Critical path**: `lib-orp → lib-player → ui-player-view → app → verify-acceptance` (5 waves); wall-clock is therefore set by player-view (biggest single unit) and the verification walkthrough.
- **Module ≠ child-session boundary**: G1/Q1 items are one-session each; `ui-quiz-dashboard` may be split into two child sessions (quiz then dashboard) inside one module without changing the DAG, since its files share no globs with others.

## 4. EPUB cut protocol (ADR-3)

Cut is allowed at M7's gate (fixture tests failing on real-world EPUBs, or time pressure) or at M15 step 2 (real Gutenberg EPUB gate fails) and consists of: delete `src/lib/zip.js`, `src/lib/epub.js`, `test/zip.test.js`, `test/epub.test.js`; M15 steps 1–2 are recorded as "cut per ADR-3". Because `pipeline.js` uses dynamic import and converts a missing module into `UnsupportedFormatError`, plus `ingest()` returns the EPUB shape only from that path, no other module changes beyond that error path. Acceptance walkthrough then rests on TXT + the bundled sample.

## 5. Coverage check — every `decisions.md` §6 file owned exactly once

| §6 item | File(s) | Module |
|---|---|---|
| 1 | `index.html`, `styles/app.css` | `shell` |
| 2 | `src/lib/text.js`, `test/text.test.js` | `lib-text` |
| 3 | `src/lib/orp.js`, `test/orp.test.js` | `lib-orp` |
| 4 | `src/lib/player.js`, `test/player.test.js` | `lib-player` |
| 5 | `src/lib/quiz.js`, `test/quiz.test.js` | `lib-quiz` |
| 6 | `src/lib/metrics.js`, `test/metrics.test.js` | `lib-metrics` |
| 7 | `src/lib/store.js` | `lib-store` |
| 8 | `src/lib/pipeline.js`, `test/pipeline.test.js` | `lib-pipeline` |
| 9 | `src/ui/a11y.js` → `shell`; `src/ui/library.js` → `ui-library` | split (justified: a11y primitives block all views, library is a view) |
| 10 | `src/ui/player-view.js` | `ui-player-view` |
| 11 | `src/ui/quiz-view.js` | `ui-quiz-view` |
| 11b | `src/ui/dashboard.js` | `ui-dashboard` |
| 12 | `src/app.js` | `app` |
| 13 | `src/lib/zip.js`, `src/lib/epub.js`, `test/zip.test.js`, `test/epub.test.js` | `epub-import` (cuttable) |
| 14 | `README.md` | `docs-assets` |
| 15 | `assets/sample.txt` | `docs-assets` |

Result: 15 / 15 owned once; 0 unowned; 0 owned twice. Out-of-§6 files (orchestrator-approved, critic-driven): `package.json` (shell), `test/harness/{library,player-view,quiz-view,dashboard}.html` (respective view modules), `.autoforge/validation/walkthrough.md` (verification evidence, not app scope).

## 6. Out of scope (guard)

No bundler config, no CI config, no service worker, no telemetry, no accounts, no cloud sync, no PDF, no LLM quiz generation, no DRM handling, no per-chunk complexity model, no in-session adaptive WPM (ADR-8/9). `package.json` is allowed ONLY as `{"type":"module"}` owned by `shell` (critic fix #2) — no dependencies, no scripts, no lockfile. Any worker finding more needed must stop and escalate.
