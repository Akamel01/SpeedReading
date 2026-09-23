# Architecture Report — SpeedReading Trainer (greenfield, local-first browser app)

Inputs read: `.autoforge/discovery/report.md` (evidence review §3, shortlist §8), `.autoforge/requirements/grilling.md` (Q/A table, MVP in/out, risks), `.autoforge/discovery/tracker-index.md:1` (zero trackers; objective is sole scope authority). No prior code exists (empty repo, `.autoforge/state.json`).

## 1. Framing

The app is a small state machine over text: import -> tokenize -> chunk -> timed display -> quiz -> metrics -> store. All logic is local, deterministic, and testable without a browser except the thin DOM layer. Evidence (discovery:22-46) says the value is in the *policy* (chunking, ORP alignment, pacing, comprehension checks), not in UI framework machinery. That drives every option below toward the smallest correct design.

## 2. Options considered

### Option 1 — Stack

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| A. No-build vanilla: `index.html` + ES modules + CSS, served by any static server | Zero deps, zero build; modules import directly under `node --test`; deploy = copy files; offline trivially | Manual DOM wiring; no JSX ergonomics; must hand-roll focus/event code | **Recommended** |
| B. Vite + React | Component ergonomics; HMR | Build step + node_modules; couples tests to bundler config; React adds ~45KB for ~5 views with trivial state; violates "no npm runtime deps" default | Rejected (no measurable pressure) |
| C. Vite + vanilla TS | Type checking; bundling | Build step; type layer not required by acceptance; adds toolchain maintenance | Rejected |
| D. Single `index.html` with inline scripts (no modules) | Opens from `file://` | Untestable units; one giant file; edit-risk grows linearly | Rejected |

Acceptance-relevant consequence: ES modules do **not** load from `file://` in Chromium (CORS), so the documented run command is `python3 -m http.server 8080` (or any static server). This is "no build", not "no server": an unavoidable browser constraint, recorded in ADR-1.

### Option 2 — Storage

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| A. IndexedDB only, thin promise wrapper | Handles multi-MB books; versioned schema; async fine for all callers; one API for texts + settings | Not usable in Node tests (thin logic, smoke-tested in browser) | **Recommended** |
| B. localStorage only | Simplest API | ~5MB per origin; one book can exceed; sync I/O on main thread | Rejected |
| C. localStorage for settings + IndexedDB for texts | Each tool matched | Two codepaths, two failure modes, marginal benefit (settings are tiny but IDB costs nothing extra once wrapper exists) | Rejected (gratuitous seam) |

Export/import = JSON dump of all stores with `schemaVersion`. No PII by construction (no accounts, no telemetry; grilling:20, 62-65).

### Option 3 — EPUB handling

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| A. In MVP, native: minimal ZIP central-directory reader + `DecompressionStream('deflate-raw')` + OPF/spine walk + XHTML-to-text | No dependency; ~200 lines total in two pure modules; testable with a generated fixture under Node (globals available ≥ Node 18) | Edge cases: ZIP64, encrypted entries, non-UTF-8 encodings, malformed OPF | **Recommended, isolated and cuttable** |
| B. Demote EPUB to v2/stretch | Smaller MVP risk | TXT-only weakens the objective ("convert books") and EPUB is explicitly in MVP scope (grilling:36) | Rejected as default; remains the fallback gate |
| C. npm dep (`epub.js`, `jszip`, `fflate`) | Fast to wire | Violates no-npm-runtime-deps; epub.js is a renderer we don't need; we need text extraction only | Rejected |

Isolation guarantee: `ingest()` returns the same `{title, chapters[]}` shape for TXT and EPUB. If EPUB quality gate fails, the TXT path, player, quiz, storage, and UI are untouched; the module pair is deleted or deferred. Quality gate (acceptance): imports a default-exported, UTF-8, deflate-or-store EPUB from Project Gutenberg; rejects with a readable error otherwise (never silently produces garbage).

### Option 4 — Comprehension quiz

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| A. Heuristic cloze: blank content words in source sentences; distractors drawn from same text; seeded PRNG; **user-editable** before use; scoring normalizes and accepts an answer list | No API, no network, deterministic (seeded), inspectable, improves as user edits | Auto-generated questions can be guessable or ambiguous | **Recommended** |
| B. Manually authored fixed question bank | High validity | Cannot cover arbitrary imported texts | Rejected (works only for samples) |
| C. LLM-generated questions | Best question quality | Explicit non-goal (grilling:18); violates no-telemetry/privacy posture | Rejected |

Validity is treated as a trend signal, not an exam: dashboard shows comprehension % alongside WPM and labels cloze quizzes "auto-generated, editable" (discovery:40-43 warns against delusional high WPM without comprehension context).

### Option 5 — Timing loop

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| A. `requestAnimationFrame` + wall-clock deadline + injected clock | Drift-free over a chunk (deadline from `performance.now()`, not accumulated frame deltas); injectable `now`/timer for unit tests | rAF throttles/stops in background tabs | **Recommended** |
| B. `setTimeout` chain | Simple | ~4ms+ clamp, drift accumulates; also throttled | Rejected |
| C. Web Worker interval messaging | Immune to tab throttling | Extra file + postMessage protocol for a case we deliberately forbid (reading while tab hidden is not a use case) | Rejected |

Mitigation for the one weakness: pause automatically on `visibilitychange -> hidden`, resume on return (explicit user action or auto-resume-at-same-chunk; auto-resume is safe since timing is deadline-based, not elapsed-based).

### Option 6 — A11y/parallel mode

An inherently visual mode cannot be "screened" word-by-word. Decision: two first-class presentation modes. (1) RSVP auto-play (visual, `aria-hidden` decorative region; controls fully labelled; status announced via `aria-live="polite"` at sentence boundaries only). (2) Screen-reader / reduced-motion mode: sentence-at-a-time or full text with `aria-live`, manual advance, plus the plain full-text view. `prefers-reduced-motion: reduce` defaults to mode 2. Keyboard: Space = play/pause, ArrowLeft/Right = seek chunk, ArrowUp/Down or +/- = WPM, Esc = exit player. Per grilling:17, accessibility wins over speed when they conflict.

### Option 7 — Testing

`node --test` over the pure library modules (`text`, `orp`, `player` with fake clock, `zip`, `epub` with fixture, `quiz`, `metrics`, `pipeline`). No framework, no jsdom. DOM/UI and IndexedDB behavior are exercised by the acceptance browser walkthrough (import -> play -> quiz -> dashboard reload-persistence); browser-level automation is out of MVP scope but the module seams keep it cheap later.

## 3. Recommended architecture (summary)

```
Browser only. No network calls. No build.
index.html + styles/ + src/
  src/lib/*   pure logic, Node-testable, no DOM/IDB imports
  src/ui/*    DOM views, no business logic beyond rendering + event wiring
  src/app.js  composition root (owns store + player instances, routes views)
```

Dependency direction: `ui -> lib`, `app -> ui + lib`, `lib` imports nothing outside `lib`. `store.js` is the only module touching IndexedDB; `player.js` is the only module owning a timer; `orp.js` is the only module that knows the ORP rule. Interfaces and data model: see `decisions.md` §3-§5.

## 4. Key risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| EPUB parser correctness (ZIP64, encryption, encodings, malformed OPF) | High | Support method 0/8 + UTF-8 only; explicit `UnsupportedFormatError` with user-readable message; tested against a generated fixture + one real Gutenberg book at acceptance; cuttable without collateral |
| Timing accuracy (rAF drift, background-tab throttling) | Medium | Wall-clock deadline per chunk; pause on `visibilitychange`; unit-test `nextDelay()` and the engine with an injected clock |
| Quiz validity (guessable/ambiguous cloze, multiple correct words) | Medium | Seeded deterministic generation, distractor pool from same text, accepted-answer list, user editing before saving, dashboard labels auto-generated quizzes; comprehension shown as trend, never as a standalone score |
| A11y of an inherently visual mode | High (gate 4 in grilling:50) | Dual presentation modes; SR mode default under reduced motion; sentence-boundary `aria-live`; all controls keyboard-operable and labelled |
| Copyright UX friction | Low-Medium | Import screen states: DRM-free, user-owned/public-domain only; no DRM handling code path exists; sample public-domain text bundled for calibration |
| Evidence overclaim ("train peripheral vision") | Medium | UI/docs copy: peripheral/perceptual-span work framed as longer-term calibration path, not a guaranteed speed boost (discovery:36-39, 80; grilling:44) |
| Storage quota/eviction | Low | IDB only; export/import JSON as user-owned backup; surface quota errors on import with actionable message |
| Adaptive-rate disruption of comprehension tracking | Low | MVP adapts **between sessions** (next target WPM from last quiz + manual control), not within a session; per-chunk complexity adaptation deferred until comprehension data exists (grilling:14 self-challenge) |

## 5. Terminology canonicalization (single authority)

- **RSVP** = Rapid Serial Visual Presentation; words presented one chunk at a time in a fixed location.
- **ORP** = **Optimal Recognition Point** — the character position near the left-of-center of a word that the eye targets first; aligning it at a fixed screen x reduces saccade cost. Any document saying "Optical Recognition Point" or "Parafoveal Preview Point" is wrong; grilling.md:55 already records the correction.
- **Chunking** = grouping 1-3 words per presentation; MVP default 2 with sentence-boundary and long-word splits, 3-word mode experimental (discovery:44-46; grilling:14).
- **Parafoveal preview** = processing benefit from text adjacent to fixation (mechanism, supported). **Peripheral-vision training** = distinct, moderate-evidence training pathway (discovery:36-39) framed as calibration, not a guaranteed boost.
- WPM always reported with the comprehension result from the same session; baseline is a session record, not a separate entity.

## 6. Recommendation

Build the no-build vanilla app with the module boundaries and data model in `decisions.md`. Keep EPUB in MVP but isolated and cuttable at its quality gate. No dependencies, no build, no backend, no telemetry. This is the smallest design that satisfies every in-scope item in grilling.md:36 and remains fully testable via `node --test` plus one browser walkthrough.
