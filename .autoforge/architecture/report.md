# Architecture Report — run speedreading-002 "close all 19 tickets"

Authority: tracker-index (19 frontier) + ticket briefs + grilling run-002 + ADR-1..10. Vocabulary: `codebase-design` (module/interface/seam/depth). Constraint: ponytail — smallest correct change; no speculative seams.
Frozen redesign spec: `.scratch/speedreading-redesign/design/` (`tokens.md` + `architecture.md` + `pass-3-*.md`; pass-3 wins on conflict, `tokens.md` wins on values).

## 1. Chapter picker (F01)
- Options: (a) chapter state in composition root + additive session fields; (b) chapter-aware store wrapper / new module.
- Recommend (a): `currentChapter` already lives in `app.js` — add a chapter-list control (library/player) that re-runs the existing `openText` path with a chosen chapter. Session delta: `chapterIndex` + `chapterTitle` (denormalized for dashboard rows without a texts join). Quiz record: add `chapterIndex`. Quiz generation stays chapter-scoped: `generateQuiz(currentChapter.text)` unchanged.
- Compatibility: `textId` remains the grouping key; dashboard/summarize untouched; old records (`chapterIndex: undefined`) render as "chapter unknown", never filtered out.

## 2. Quiz authoring (F02)
- Options: (a) new view + route; (b) second mode inside `quiz-view.js`.
- Recommend (b): one module, two render paths — `renderAuthoring(quiz)` (edits `answer`/`accepted`) vs `renderAnswering(quiz)` (writes only `userAnswer`). The seam already exists: answering maps inputs→`userAnswer` and never reads `accepted` (quiz-view.js:83-91). Data shape: in-place edit + existing `edited` flag (no parallel copy record — a copy would double the quiz lifecycle for one boolean of information).
- Leak guard: test asserts answering DOM + storage contain no expected-answer strings; review rule: answering path may not reference `q.answer`/`q.accepted`.

## 3. WPM active-time pure function (F03)
- Options: (a) extract to `metrics.js` as pure function; (b) class/clock-injected service.
- Recommend (a): `activeMs(events) -> ms` in `src/lib/metrics.js`, `events = [{at, expectedMs}]`, per-gap rule `min(gap, expectedMs*4+250)` — the exact formula inline in `app.js:100-107` today. Cap values frozen (document, don't retune).
- Caller contract: `app.js` collects `{at: performance.now(), expectedMs: nextDelay(chunk, wpmAtEmission)}` per `chunk` event and calls `activeMs` at session end; `elapsedMs = max(1, activeMs>0 ? round(activeMs) : wallMs)` unchanged. Equivalence: uninterrupted session ≡ sum of expected delays (± rounding); proven by unit test, not inspection.

## 4. Regression fixtures (F04)
- Options: (a) excerpt in test file; (b) `assets/` sample + loader.
- Recommend (a): ~150–250-word public-domain excerpt inline in `test/quiz-regression.test.js` (or `quiz.test.js`), fixed seed, exact-output assert + stopword/distractor/seed-sensitivity invariants. Test-only — never an app asset (ADR-10 posture, no new load path).
- Blast-radius rule: any generator change that moves the fixture fails `node --test` until the fixture diff is deliberately updated AND reviewed as a quality judgment. Fixture churn is a signal, not noise.

## 5. Export/import E2E vs IDB hardening line (F05/F07 — overlap resolved)
- F05 owns the UI round-trip in the browser harness: seed → export → wipe → import through the real UI with confirm-accept, confirm-dismiss (no import, no loss), wrong-schema file → readable error + data intact.
- F07 owns simulated failure units against the store contract in a browser context: quota-exceeded write, aborted tx (rejects, never hangs, no partial writes), malformed payload; recovery copy reuses existing alert surfaces (no new dialogs).
- Split line: quota/abort paths = F07 only; schema-mismatch path = F05 only; both assert "existing data intact". Neither changes the export schema.

## 6. SR/keyboard split (F06)
- Automatable slice (agent, in `test/harness/` + scripted walkthrough): key-event walk of the full loop, tab order / focus visibility, live-region text assertions at sentence boundaries, reduced-motion default + manual sentence mode state.
- Human-only slice (stays `ready-for-human`): listening to real SR announcements (VoiceOver/NVDA), keyboard-only full loop noting traps/dead ends, announcement-quality judgment. Automation asserts attributes; only ears assert usability.

## 7. Perf harness (F08)
- Placement: standalone node script (explicit run, NOT in the `node --test` gate — budgets must not slow the suite) + in-browser import timing via the walkthrough harness. Measures tokenize+chunk wall time and heap on the 130k-word novel.
- Initial budgets (ticket records verdict): Node < 2s, browser import < 3s with responsive first paint, chunk-array heap < 100MB. Fix-only-on-miss: within budget → numbers recorded, zero code change; miss → fix (e.g. lazy per-chapter tokenization) lands with before/after numbers. No workers/virtualization without a measured miss.

## 8. Span mode (F10 + gate-5 overclaim guard)
- Options: (a) new view + lib drill module; (b) drill mode inside `player-view.js` reusing chunk/ORP/player engine.
- Recommend (b): no new view file; drill varies preview width around the fixed ORP anchor, recognition checks reuse `scoreQuiz` semantics, drill sessions reuse the session record + optional `drill:'span'` flag (summarize/dashboard unchanged, same honesty rules).
- Gate-5 guardrails (hard stop): no UI/doc/metric string may promise speed gains — grep-blocked words (`faster`, `boost`, `double`, `improve your speed`); copy frames calibration practice only; drill `comprehensionPct` labeled as recognition checks, never mixed into reading-comprehension trend without the `drill` flag visible.

## 9. Redesign build (RB1–RB3 + RS1–RS7)
- Authority confirmed: frozen spec files above; code-impact analysis in `design/architecture.md` (already grilled 5/5, no ADR conflicts).
- B-module interfaces (frozen): `h(tag, attrs, ...children)` in `src/ui/h.js` (`on:`/`class:` shorthand); `splitSentences(text)->string[]` in `src/lib/text.js` (abbreviation-aware); `sessionTicks(sessions)->{wpm,comprehensionPct,best}[]` in `src/lib/metrics.js`; `styles/tokens.css` (`:root` only) + `styles/app.css` (consumes only, two link tags, order matters).
- S-chain ownership (single-`app.css` collision rule): strictly sequential per `blocked_by`; each ticket owns named sections — S1 header/nav, S2 library, S3 player+rail+setup, S4 quiz, S5 dashboard, S6 motion/responsive; append-only edits outside owned sections forbidden. B1–B3 parallel. No player-view split / settings / router modules (rejected hypothetical seams — upheld).
- Depth note: `h()` earns its seam (4+ view adapters migrate in S2–S5); `splitSentences`/`sessionTicks` earn theirs (SR mode + rail/strip + tests share them).

## 10. Top risks
1. Chapter attribution drift — quiz/session pointing at different chapters. Mitigate: single `currentChapter` source in `app.js`; quiz inherits session's `chapterIndex`; test chapter-jump → session+quiz attribution.
2. Authoring leak — expected answers rendered while answering. Mitigate: answering-DOM exclusion test (§2); answering path code-review rule.
3. WPM equivalence break — refactor shifts happy-path numbers. Mitigate: equivalence unit test (§3) + walkthrough WPM unchanged within rounding.
4. Quiz fixture churn — generator tweaks held hostage by brittle exact-match. Mitigate: deliberate-update rule (§4); keep excerpt short so diffs stay reviewable.
5. Pages deploy timing (RS7) — push-to-main auto-redeploys mid-verification. Mitigate: full suite + e2e + review APPROVED before push; live-URL check after; no feature work in S7.

## Ticket traceability
F01→§1, F02→§2, F03→§3, F04→§4, F05→§5, F06→§6, F07→§5, F08→§7, F10→§8, RB1/RB2/RB3→§9, RS1–RS7→§9/§10.5. No ticket needs architecture beyond what its section states.
