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

---

# Run 003 — product transformation (ADRs 21–27, §13–16)

Appended 2026-09-23. Inputs: `.scratch/speedreading-product/{spec.md,map.md,issues/01..08}`, `.scratch/speedreading-gamify/` (wave 1), `.autoforge/requirements/grilling.md` §"Orchestrator decisions (binding)" (cited as **binding N**), `.autoforge/discovery/report.md`. ADR-1..20 remain in force; supersessions are stated explicitly where they occur (ADR-23 supersedes the `schemaVersion:1` export freeze; binding 5 supersedes gamify/06's `settings.seenAchievements`). Run-003 build authority for visual values: `design/direction.md` (product/01 deliverable; PENDING).

## 12. New ADRs (run 003)

### ADR-21 Information architecture, navigation, session lifecycle
- Context: product/02. Four views exist and work (`index.html:29-40`, `app.js:30-46`); the mission §3 journey (Library → prepare → Player → Quiz → summary → Dashboard) and ~21 first-class states have no assigned surfaces; interrupted sessions are lost on close (`app.js:55-66` in-memory only); the summary has no home.
- Decision:
  - **Shell/nav**: 4 views retained (Library, Player, Quiz, Dashboard), no new top-level views. Persistent header (brand + gamification HUD) + nav row ≥768px; <768px the nav row becomes a fixed bottom tab bar (4 buttons, min 44px targets, safe-area padding) — CSS-only, same DOM nodes and order, so routing/focus tests survive. `show(name)` additionally sets `document.body.dataset.view = name`; in `player` view the shell nav + HUD hide (distraction-free, mission §7) and restore on exit. Existing fallbacks preserved (Player→library when no session; Quiz→library when no active quiz).
  - **Journey**: prepare = state of Player view (`ready`: goal + settings visible, Play button; autoplay on open preserved per existing walkthrough); Player = `active`/`paused`; Quiz = view; award/summary = state of Dashboard (`render({summary})`, binding 4); Dashboard = view. No overlays for primary flow.
  - **State → surface table** (21 states; enter/exit):

| State | Surface | Enter | Exit |
|---|---|---|---|
| first-use | Library empty state (import CTA + rights copy) | boot, texts=0 and sessions=0 | import success |
| empty library | Library empty state | texts=0 | import success |
| populated library | Library list | texts>0 | open/delete/import |
| importing | Library import row (`aria-busy`, progress label) | file/paste/URL import start | success/failure |
| parsing | same row, "Parsing…" | `ingest()` running | success/failure |
| failed import | Library inline error banner + recovery (retry; URL → paste fallback) | `ingest()`/fetch throws | dismiss/retry |
| unsupported content | Library error banner with `UnsupportedFormatError` reason | ingest throws unsupported | dismiss |
| ready (session) | Player ready state (goal chip, settings, Play) | `openText()` / prepare | play |
| active | Player playing | play (or autoplay) | pause/end/exit |
| paused | Player paused | pause / `visibilitychange hidden` | play/end/exit |
| completed (session) | transition Player→Quiz | player `end` → `recordSession` | quiz shown |
| quiz (answering) | Quiz view answering | recordSession | submit/cancel |
| quiz completed | Quiz review state (per-question correct/incorrect/skipped + score) | submit | continue → summary |
| achievement unlocked | Summary moment + Dashboard achievements | evaluation after quiz save | seen marked/dismiss |
| level-up | Summary moment + Dashboard level card | level index increased | dismiss |
| streak update | Summary moment + Dashboard streak card | `activeToday` newly true | dismiss |
| returning user | Library resume banner + Dashboard recent | boot with history | open/resume/dismiss |
| no recent activity | Dashboard low-data state (designed empty) | 0/stale sessions | new session |
| corrupted data | Shell boot banner (readable + Retry) with safe defaults | store open/load error, corrupt profile | retry/reload |
| interrupted session | Library "Resume reading" banner + Dashboard card | pagehide/close with `activeSession` | resume/discard |
| restored session | Player resumed (paused, chunk position restored) | resume action | play/exit |

  - **Session lifecycle**: `idle → ready → playing ⇄ paused → ending → quiz → summary → dashboard`. `sessionId` is minted once at player start (`app.js` `openText`), not at record time (supersedes the mint-at-record detail of binding 2's citation; the idempotency key is unchanged).
  - **Resumability — what persists when**: `profile.activeSession = {sessionId, textId, chapterIndex, chunkIndex, wpm, chunkSize, elapsedMs, startedAt, savedAt}` written on pause, `visibilitychange hidden`, `pagehide`, and exit-without-end; `elapsedMs` snapshot = accumulated `activeMs(readEvents)` so far (readEvents reset at snapshot); cleared when the session is recorded and when quiz is cancelled. On boot: snapshot with a missing `textId` is discarded silently; otherwise offer Resume (paused, `seek(chunkIndex)`, elapsed seeded from snapshot). No TTL (single user, own data).
- Alternatives: new summary view/route (rejected, binding 4); sidebar shell (rejected: 4 items do not justify it); DOM-level mobile nav (rejected: breaks routing/keyboard tests for no gain).
- Consequence: no new views; `show()` gains one dataset write; header HUD and player focus mode are CSS + a body attribute. Resume adds one profile write path (ADR-22/23). Risk: snapshot/restore double-counting — owned by `app.js`, tested (ADR-27).

### ADR-22 Domain events + profile/repository seam
- Context: product/03 + binding 1/2/5. Mission §14 wants action → event → engine → persistence → feedback with reward logic out of views. History (sessions/quizzes) is append-only (no session deletion path, `app.js:257-260`); derived recompute is deterministic; only non-derivable state needs persistence.
- Decision:
  - **Two-layer projection, no event bus, no persisted log** (binding 1). `src/lib/events.js` is pure: `facts()` projects the append-only history into typed facts; `rewardMoments()`/`sessionMoments()` compose the engines into the ordered reward timeline the UI consumes. Engines stay independently testable and keep wave-1 signatures.
  - **Event names + payloads + idempotency keys**:

| type | key | at | payload |
|---|---|---|---|
| `session.completed` | `session:<id>` | `endedAt` | `{sessionId, textId, chapterIndex, kind, chunkSize, targetWpm, wordCount, elapsedMs, wpm, comprehensionPct|null, drill|null}` |
| `session.quiz_completed` | `quiz:<sessionId>` | quiz `createdAt` | `{sessionId, quizId, correct, total, pct, edited}` |
| `record.set` | `record:<recordId>:<at>` | improvement `at` | `{recordId, value, previous, sessionId?, day?}` |
| `streak.day` | `streak:<dayKey>` | day end (derived `at` = last session `endedAt` that day) | `{day, current, longest}` |
| `achievement.unlocked` | `achievement:<id>` | `unlockedAt` | `{achievementId, sessionId?}` |
| `level.up` | `level:<index>` | session/quiz `at` | `{index, name, xp}` |
| `challenge.completed` | `challenge:<id>:<periodStart>` | session/quiz `at` | `{challengeId, period, periodStart, xp}` |

  Facts sorted `(at asc, key asc)`, keys unique; malformed records skipped, never thrown. `session.quiz_completed` is emitted only when a quiz record exists for the session (`sessionId` match), so refresh-mid-quiz loses only the unsaved quiz (binding 2).
  - **Derived + append-only posture**: XP/level/streak/achievements/records/challenges recomputed from `sessions` + `quizzes` on every render; no ledger, no counters, no tombstones (binding 1). Idempotency is structural: one key per session; quiz re-saves amend the same session record (existing pattern, `app.js:300-314`).
  - **Repository seam** (binding 5): `src/lib/profile.js` — `createProfileRepository(store, {profileId='local'})` with `load/save/markSeen/getActiveSession/setActiveSession/setUiPrefs`. One `profile` record (`id:'local'`), `profileId` stamped on write. No backend, no auth, no framework. `settings` record keeps player settings untouched; `seenAchievements` lives in `profile`, **superseding gamify/06's `settings.seenAchievements`**.
- Alternatives: persisted event log / XP ledger (rejected: second write path, migration surface, violates binding 1); pub/sub event bus (rejected: one consumer graph, pure functions suffice); moving all settings into profile (rejected: churn in every existing settings reader).
- Consequence: views never compute rewards; `app.js` is the only profile/store writer; the whole economy is reproducible from an export file. Cost: recompute is O(n) per render — bounded by binding 9 budgets (ADR-27).

### ADR-23 Persistence v2
- Context: product/03 + binding 6. DB v1 (`speedread`, stores texts/quizzes/sessions/settings) has no profile store; export is `schemaVersion:1` (`store.js:77-83`); import validates schemaVersion and replaces after confirm. Existing users' data must survive; export/import is the user's ownership path (ADR-10).
- Decision:
  - **Store v2**: `VERSION 2`; `onupgradeneeded` additive only — existing stores untouched, `profile` created if absent (`keyPath:'id'`). v1→v2 upgrade is performed by IndexedDB itself and is atomic: if the upgrade aborts, v1 data is intact and `openStore()` rejects; the app then renders the shell-level corrupted-data state (readable error + Retry/reload) — never a silent reset.
  - **Export**: `{schemaVersion: 2, texts, quizzes, sessions, settings, profile}`. **Import**: accepts `1` (wrapped into v2 defaults: `profile` default record; missing optional fields defaulted, records never filtered) and `2`; unknown/newer (`schemaVersion: 3+`) or malformed → `{ok:false, error}` with readable copy; validation-before-clear preserved; all stores replaced in one readwrite transaction (existing pattern, `store.js:88-111`). Record-level validation: every array entry must be a non-null object with a non-empty string `id` → else `invalid-record:<store>[i]`. Duplicate ids within an import are deduped by last-write (IDB `put` semantics) before counting (invariant I2).
  - **Failure behavior**: quota/abort/malformed → error string, existing data intact (ADR-15 split line unchanged); corrupt `profile` record on load → defaults + `{recovered:true}` flag, never throws.
  - **Invariants (§29) as testable statements** (`test/invariants.test.js` unless noted):

| id | statement | test |
|---|---|---|
| I1 | `totalXp` is monotonic in appended history (never decreases absent explicit reset) | property: generate append sequences, assert non-decreasing |
| I2 | no double award per event: timeline keys unique; duplicate session ids in import count once | `events.test.js` + import dedupe test |
| I3 | completed sessions are immutable after the single quiz amendment: no store API updates a session; answering save amends at most once; authoring save never amends | grep/review rule + app-path test |
| I4 | a streak counts once per calendar day (dayMap counts days, not sessions) | `streak.test.js` |
| I5 | achievements unlock once; `unlockedAt` = earliest qualifying event; seen-marking idempotent | `achievements.test.js` + profile harness |
| I6 | imported data cannot produce invalid state: accept or reject with state intact | import negative tests (v1/v2/malformed/dup) |
| I7 | level always corresponds to XP: `levelFor(totalXp)` round-trips; monotonic | `xp.test.js` property |
| I8 | all progress values are clamped 0..100 | `achievements.test.js` + `challenges.test.js` |
| I9 | quiz scores stay 0..100 (`scoreQuiz`) | `quiz.test.js` |
| I10 | persisted state is migratable or safely rejected (v1 accepted; 3+ rejected readably; corrupt profile recovered) | store harness + import tests |
- Alternatives: new DB name (rejected: orphans v1 data); lazy in-place migration on read (rejected: two code paths forever); rejecting v1 exports (rejected: breaks ADR-2 ownership promise).
- Consequence: **supersedes the `schemaVersion:1` freeze in §8/ADR-2** for export shape; import stays backward-compatible. DB version bump is the first since run 001; the upgrade hook now exists and is tested.

### ADR-24 Gamification economy
- Context: product/04 + binding 1/2/3/9; mission §9–11, §16–19. Wave-1 engines exist only as briefs; their constants are replaced here (naming scheme kept: book-format ladder, `sessionXp/totalXp/levelFor`, `dayKey/dayMap/streakStats`, `ACHIEVEMENTS/evaluate`).
- Decision (exact values; all integer; all derived):
  - **XP per source**:

| source | value | cap |
|---|---|---|
| session words | `floor(wordCount/10)` | — |
| repeat: same `textId` same local day, 2nd+ session | ×0.5, floor | — |
| comprehension ≥60% | +10 | once/session |
| comprehension ≥80% | +20 (replaces +10) | once/session |
| WPM target met (`wpm ≥ targetWpm`) **and** comprehension ≥60% | +15 | once/session |
| all session-source XP | — | **500 per local day** |
| drill words (`drill:'span'`) | `floor(wordCount/20)` | shared daily cap |
| drill recognition | +1 per correct | max 20/session |
| streak: each consecutive day beyond the first in a run | +10 | derived history |
| streak: each complete 7-consecutive-day block | +50 | derived history |
| daily challenge complete | +50 | once/period |
| weekly challenge complete | +150 | once/period |
| record improvement (strict) | +30 | max 3/day (90) |
| achievement unlock | +25 | once/achievement |

  Worked example: 1,000-word session, 75% comprehension, target met → 100+10+15 = 125 XP; a same-text second session that day → 50+10+15 = 75 XP. Unscored session earns base only. Every term is monotonic in appended history (I1).
  - **Levels** (book-format ladder, 11 tiers; `levelFor` clamps at max, `progress` 0..1): Leaflet 0 · Pamphlet 100 · Chapbook 300 · Novella 700 · Paperback 1500 · Hardcover 3000 · Tome 6000 · Codex 12000 · Compendium 24000 · Scriptorium 48000 · Library 96000.
  - **Achievement catalog** (26; `id`/title/category/rarity/requirement/hidden; predicates testable; `unlockedAt` = earliest qualifying event; hidden renders "???" until unlocked):

| id | title | category | rarity | requirement | hidden |
|---|---|---|---|---|---|
| first-session | First entry | getting-started | common | Record one reading session | |
| first-quiz | First check | getting-started | common | Complete one comprehension quiz | |
| sessions-10 | Ten laps | volume | common | Record 10 reading sessions | |
| sessions-25 | Twenty-five laps | volume | uncommon | Record 25 reading sessions | |
| sessions-100 | One hundred laps | volume | rare | Record 100 reading sessions | |
| sessions-250 | Two hundred fifty laps | volume | epic | Record 250 reading sessions | |
| words-10k | Ten thousand words | volume | common | Read 10,000 words across sessions | |
| words-100k | Hundred thousand words | volume | uncommon | Read 100,000 words across sessions | |
| words-1m | One million words | volume | epic | Read 1,000,000 words across sessions | |
| streak-3 | Three-day rhythm | consistency | common | Read on 3 consecutive local days | |
| streak-7 | Seven-day rhythm | consistency | uncommon | Read on 7 consecutive local days | |
| streak-30 | Thirty-day rhythm | consistency | rare | Read on 30 consecutive local days | |
| streak-100 | Hundred-day rhythm | consistency | epic | Read on 100 consecutive local days | |
| five-of-seven | Five of seven | consistency | uncommon | Read on 5 days within one calendar week | |
| comeback | The return | consistency | uncommon | Read again ≥14 days after your previous session | yes |
| comprehension-80 | Eighty percent | comprehension | uncommon | Score ≥80% on one quiz | |
| comprehension-90 | Ninety percent | comprehension | rare | Score ≥90% on one quiz | |
| perfect-quiz | Clean sweep | comprehension | epic | Score 100% on one quiz | |
| wpm-300 | Three hundred | speed | uncommon | Reach 300 wpm with ≥80% comprehension that session | |
| wpm-450 | Four fifty | speed | rare | Reach 450 wpm with ≥80% comprehension that session | |
| wpm-600 | Six hundred | speed | epic | Reach 600 wpm with ≥80% comprehension that session | |
| first-record | Personal best | records | uncommon | Improve a WPM personal record (scored, ≥60%) | |
| sustained-improvement | Sustained climb | records | rare | 3 scored sessions in a row, wpm non-decreasing, comprehension ≥70% each | |
| marathon | Long session | records | rare | Read ≥45 minutes in one session | yes |
| texts-5 | Across the shelf | exploration | uncommon | Read from 5 different texts | |
| drill-master | Calibration practice | exploration | common | Complete 10 span-drill sessions | |

  - **Challenges** (deterministic rotation by local calendar; `daySerial`/`weekIndex` computed from local date parts — never fixed-ms addition, DST-safe; progress derived without the UI open, binding 3):
    - Daily, rotate `daySerial % 3`: `d-read` "Read 500 words today" (500 words) · `d-comprehend` "Finish a quiz with at least 60% today" (1 scored session) · `d-focus` "Read actively for 10 minutes today" (600,000 ms elapsed).
    - Weekly (Monday-start), rotate `weekIndex % 3`: `w-volume` "Read 5,000 words this week" · `w-days` "Read on 4 days this week" · `w-comprehend` "Score 70% or more on 3 quizzes this week".
    - Reset = period boundary derived from injected `now` (`localDayStart`, `localWeekStart`); no stored state; a completed period's result never changes (monotonic).
  - **Personal records** (`records.js`; ties → earliest `at`): `fastest-wpm` (scored ≥60%, drill excluded) · `best-comprehension` · `best-combined` (wpm × pct/100, scored) · `longest-session` (elapsedMs, drill included) · `most-words-day` · `most-sessions-day` · `longest-streak` · `fastest-wpm-chunk-1/-2/-3` (per `chunkSize`, scored ≥60%). Improvement events emitted only on strict improvement.
  - **Reward-priority ordering** (display, most meaningful first): 1 record · 2 achievement unlock · 3 level-up · 4 challenge complete · 5 streak update. Summary renders max 1 hero + ≤3 compact lines; overflow → "+N more" pointing at Dashboard achievements/records. Only moments attributable to the just-completed session are shown (`sessionMoments`), never a historical replay.
  - **Drill exclusion**: drill sessions are excluded from comprehension/WPM bonuses, speed/comprehension/records achievements, `fastest-wpm`/`best-comprehension`/`best-combined`/per-mode records, `d-comprehend` and `w-comprehend` challenges. They earn half-rate words XP, recognition XP, and count for volume/exploration achievements and `longest-session`.
  - **Copy rules (extends ADR-18)**: existing speed-promise grep stays; adds guilt-ban (`don't lose|lose your streak|streak at risk|keep your streak|don't break`) and fake-social ban (`leaderboard|other readers|users like you|rank`); XP copy is legible and factual ("Words read 1,000 → 100 XP"), no fabricated numbers.
- Alternatives: WPM-dominant XP (rejected: rewards speed over comprehension); persisted streak/achievement state (rejected: derived is deterministic and rollback-free); fixed daily challenge (rejected: rotation is still deterministic and gives variety); streak freezes (rejected: wave-1 out of scope, unchanged).
- Consequence: all economy outputs are pure functions over history; export alone reproduces the entire economy. Wave-1 briefs 01–03 are superseded on constants/catalog, not on file/signature.

### ADR-25 Feedback loop surfaces
- Context: product/07 + binding 4/9. Quiz view has answering + authoring modes (ADR-12) and all-at-once submit; dashboard is a lap table; no summary surface; no reward sequencing; charts must stay readable at 320px and 1000+ sessions.
- Decision:
  - **Quiz state machine** (per-question: `unanswered → selected → submitted`; overall: `answering → submitted → review → completed`): all-at-once submit preserved (scoring loop unchanged); empty answer at submit = `skipped` (still scored incorrect per `scoreQuiz`). `review` renders per-question correct/incorrect/skipped + score + "Edit expected answers" (enters authoring). Authoring is preserved per ADR-12: edits persist the quiz record (`edited:true`) and must **not** amend an already-completed session (I3); the session-amend path runs only for answering saves. `onCancel` unchanged.
  - **Session summary = dashboard state** `render({summary})` (binding 4), content order: (1) heading "Session summary" + text/chapter; (2) hero stats — WPM, comprehension %, words, duration; (3) comparison to own baseline (Δ vs personal avg/best; only when prior history exists); (4) reward moments (hero + ≤3 compact); (5) XP earned + level progress; (6) streak status; (7) records broken; (8) achievements unlocked; (9) "what to train next" (existing `suggestNextWpm` suggestion + Accept); (10) actions — Dashboard / Read next. Focus moves to the summary heading; one consolidated polite announcement ("Session complete. 412 wpm, 80% comprehension.") + reward details announced once, not per moment.
  - **Dashboard card set + hierarchy**: (1) primary performance `StatRow` (current/best/avg WPM, avg comprehension, words, sessions) + `LevelCard` + `StreakCard`; (2) next actions (adaptive suggestion, resume card, challenge card); (3) trends — `wpmChart` (WPM + comprehension, two series, comprehension quieter) and 30-day words activity bars; (4) recent sessions table (recent 50 + "show all/aggregate" toggle); (5) achievements (recent unlocks + grid); (6) records list. Low-data: 0 sessions → designed empty + import CTA; 1–3 sessions → trend chart hidden with "trend needs 4 sessions"; challenge cards always visible. Existing lap table behavior survives as the recent-sessions table (same columns, delta, best marker).
  - **Chart choices + downsampling** (binding 9): hand-rolled SVG (ADR-1, gamify/05); `maxPoints = 120` — raw when ≤120 sessions, else day buckets when distinct days ≤120, else week buckets; bucket value = mean WPM / mean non-null comprehension; deterministic. Empty/1-session states render text, never NaN paths.
  - **Reward-moment sequencing**: priority order ADR-24; moments render `role="status"`, dismissible, no focus theft; `prefers-reduced-motion` → opacity-only, no transform, no count-up; authoring/review never triggered by a reward moment.
- Alternatives: per-question immediate feedback (rejected: changes scoring loop and ADR-12 boundaries); summary as modal/overlay (rejected: binding 4 + focus-trap risk); pixel-diff chart baselines (rejected, binding 8).
- Consequence: quiz record shape and `scoreQuiz` untouched; dashboard `render({sessions, suggestion})` stays valid (gamify/summary optional); one new state, no new view.

### ADR-26 Design-system architecture
- Context: product/01 (HITL, PENDING values) + mission §4/§5/§12/§20/§25; incumbent folio/ink/marker world is the default posture (map.md Notes); ADR-19 freezes `tokens.css` `:root`-only + `app.css` consumes.
- Decision (structure frozen; **values PENDING product/01**):
  - **Token roles** in `tokens.css`, grouped with comments; incumbent names preserved as aliases (e.g. `--folio: var(--color-bg)`), so existing `app.css` keeps working while W2 migrates:
    - color: `--color-bg`, `--color-surface`, `--color-surface-elevated`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-success`, `--color-warning`, `--color-error`, `--color-info`, `--color-xp`, `--rarity-common|uncommon|rare|epic`;
    - type: `--font-display|ui|data` (exist) + `--text-xs|sm|md|lg|xl|2xl|3xl`, `--leading-tight|normal|loose`, `--weight-regular|medium|semibold`;
    - space (4px base): `--space-1|2|3|4|5|6|8|10|12`;
    - radius: `--radius-sm|md|lg|pill`; elevation: `--elev-1|2|3`;
    - control heights: `--control-h-sm|md|lg` (32/40/48);
    - breakpoints (documented; used in `app.css` media queries, not as CSS vars): 320/375/430/768/1024/1280/1440/1920;
    - motion: existing `--dur-*`/`--ease-calm` + `--dur-reward` (≤320ms), `--ease-enter` if product/01 adds one;
    - focus: `--focus-color` (exists), `--focus-width`.
  - **Slot-in points**: product/01 delivers `design/direction.md` with a value table keyed by the role names above + prototype page; W2 fills values only (no structural edits), gamify G1/G2 and W4 surfaces consume roles.
  - **Component inventory + states** (mission §25; classes are the contract): `.btn` (`primary|secondary|quiet|danger`; default/hover/focus-visible/active/disabled/`is-loading`+`aria-busy`), `.field` (input/textarea/select + help/error), `.check`/`.switch`, `.card`/`.card-elevated`, `.row` (list item), `.badge`, `.stamp` (locked/unlocked + rarity), `.stat`, `.progress` (`role=progressbar`), `.chart`, `.table`, `.empty`, `.skeleton`, `.banner` (`info|success|warning|error`), `.dialog`/`.sheet`, `.toast`/`.status`, `.tabs`/`.nav-item`, `.calendar`. Every interactive component: default/hover/focus/active/disabled; async: loading; data: success/warning/error/empty/partial/completed. No browser-native-looking control where a product-level interaction is expected.
  - **Motion system + reduced motion**: durations — press 100ms, status 150ms, view 180ms, tick/reward 240ms; easing `--ease-calm`; rules — view rise on section show (existing), card entrance ≤240ms, XP/reward moments ≤320ms and never block input, no animation on RSVP chunks (reading priority), list changes fade only. `prefers-reduced-motion: reduce` → opacity-only ≤150ms, no transform, no count-up, no stamp-press; functionality never depends on motion.
- Alternatives: replace the world (deferred to product/01's prototype; default is preserve+expand per map.md); a second stylesheet per surface (rejected: ADR-19 two-link discipline); utility-class system (rejected: no build).
- Consequence: all visual values land in one HITL-reviewed file; structure is implementable now. Risk: token restructure vs gamify appends — enforced by wave order + §15 section ownership.

### ADR-27 Verification strategy
- Context: product/08 + binding 7/8/10/11; existing evidence patterns (`node --test`, CDP harnesses, walkthrough, screenshot-less review). Mission §28–31 is the bar; CI/cloud is out of scope.
- Decision:
  - **Harness inventory + commands** (all zero-dep):
    - `node --test test/` — unit + property/invariant (existing 12 files + new: `xp`, `streak`, `achievements`, `challenges`, `records`, `events`, `invariants`, `profile`(pure parts), store-shape tests).
    - `node .autoforge/validation/e2e-walkthrough.mjs` — full journey incl. resume, summary, reward-once, refresh, close/reopen, export→clear→import (v2), v1 import.
    - `node scripts/a11y-checks.js` · `node scripts/export-import.js` · `node scripts/idb-failure.js` · `node scripts/perf-large-book.js` (existing).
    - NEW: `node scripts/dashboard-perf.js` (1000-session fixture, render budget) · `node scripts/security-checks.mjs` (greps + JSON shape probes) · `node scripts/screenshots.mjs` (6 surfaces × key viewports).
    - Manual: `python3 -m http.server 8080` + `docs/browser-checklist.md` (Safari/Firefox, touch, zoom/reflow, SR listening).
  - **Coverage map (mission criterion → evidence)**:

| criterion | evidence |
|---|---|
| §2–3 IA/flows | e2e-walkthrough journey steps (all 21 states exercised) |
| §4 design system | `tokens.css` `:root`-only grep; role-name grep; screenshot review |
| §5 responsive | CDP viewport checks 320/375/430/768/1024/1280/1440/1920: overflow, ≥44px targets, reflow at 200%/400% zoom |
| §6 library | e2e import (file/paste/URL/JSON), search/filter/sort/favorite steps + harness |
| §7 player | e2e playback/controls/speed/pause/resume/restore steps |
| §8 quiz | quiz harness + e2e; ADR-12 answering-exclusion test stays green |
| §9–11,16–19 economy | unit tests (xp/streak/achievements/challenges/records) + e2e reward-moment + reward-once steps |
| §12 motion | reduced-motion CDP emulation + static-branch harness assertions |
| §13 persistence | `idb-failure.js` + e2e refresh/close-reopen/resume |
| §14 events | `events.test.js` determinism, key-uniqueness, sessionMoments attribution |
| §15 dashboard | `dashboard-perf.js` (<100ms @1000 sessions) + dashboard harness |
| §20 a11y | `a11y-checks.js` (attributes/focus/contrast) + human SR pass (ADR-16, unchanged) |
| §21 browsers | Chromium automation + manual checklist results in validation report |
| §22 perf | `perf-large-book.js` (Node <2s, import <3s, heap <100MB) + dashboard budget |
| §23 security | `security-checks.mjs`: no-`innerHTML` grep, URL http(s)+~10MB cap, JSON shape validation |
| §24 import/export | `export-import.js` + v1-acceptance + malformed-rejection E2E |
| §25 states | harness state assertions per component |
| §28 tests | `node --test` + harnesses + e2e |
| §29 invariants | `test/invariants.test.js` (I1–I10) |
| §30–31 | `.autoforge/validation/report-003.md` (honest limits stated) |
  - **Invariant/property tests**: `invariants.test.js` uses a tiny deterministic PRNG (no deps) to generate append sequences for I1/I2/I7; I3 is enforced by grep + app-path test (no session-update API exists); I8/I9 boundary tables; I6/I10 via store harness.
  - **Persistence-recovery E2E**: refresh; tab close/reopen with the same CDP user-data-dir; export→wipe→import v2; import v1 export; malformed/newer-schema negative. Resume: pagehide → boot → Resume → paused at restored chunk.
  - **Screenshot review**: `scripts/screenshots.mjs` writes `.autoforge/validation/screenshots/{library,player,quiz,summary,dashboard,import}-{390,1280}.png` per gate; human reviews at checkpoints; **no pixel-diff tool** (binding 8) until a regression bites.
  - **Security assertions**: grep `innerHTML|outerHTML|insertAdjacentHTML` over `src/` (must be zero); URL imports http(s)-only + response size cap ~10MB with readable error; JSON import validates shape before use; all imported content rendered via `textContent`/`h()`.
  - **Honest limits**: automation is headless Chromium only (binding 7); no SR announcement-quality automation (ADR-16); screenshot review is human; no pixel diff; CDP synthetic-key events are not trusted input (known limitation); `node --test` does not exercise IDB (harnesses do).
- Alternatives: Playwright/pixel-diff (rejected: deps/binding 8); in-suite perf (rejected: slows gate, ADR-17); CI service (out of scope).
- Consequence: every mission §28–31 claim maps to a command or an explicitly human gate; validation reports state the browser/SR limits instead of implying full coverage.

## 13. Module interface freezes (run 003)

```js
// src/lib/events.js (new; pure; imports xp/streak/achievements/challenges/records)
facts({ sessions = [], quizzes = [] } = {}) -> Fact[]
// Fact = { type:'session.completed'|'session.quiz_completed', at:number, key:string, sessionId:string, payload:object }
// sorted (at asc, key asc); keys unique; malformed records skipped
rewardMoments({ sessions = [], quizzes = [], today } = {}) -> Moment[]
// Moment = { type:'record'|'achievement'|'level'|'challenge'|'streak', at:number, key:string, priority:1|2|3|4|5, payload:object }
sessionMoments({ sessions = [], quizzes = [], today, sessionId } = {}) -> Moment[]

// src/lib/profile.js (new; store injected; never throws)
createProfileRepository(store, { profileId = 'local' } = {}) -> {
  load() -> Promise<Profile>,                    // corrupt -> defaults + {recovered:true}
  save(patch) -> Promise<Profile>,
  markSeen(ids: string[]) -> Promise<Profile>,
  getActiveSession() -> Promise<ActiveSession|null>,
  setActiveSession(snapshot: ActiveSession|null) -> Promise<Profile>,
  setUiPrefs(partial) -> Promise<Profile>,
}
// Profile = { id:'local', profileId, schemaVersion:2, seenAchievements:string[], activeSession:ActiveSession|null, uiPrefs:object, createdAt, updatedAt }
// ActiveSession = { sessionId, textId, chapterIndex, chunkIndex, wpm, chunkSize, elapsedMs, startedAt, savedAt }

// src/lib/xp.js (new; dependency-free)
sessionXp(session, { repeatIndex = 0 } = {}) -> number
sessionsXp(sessions) -> number                    // daily cap 500 + same-text same-day repeat factor
streakXp(dayMap) -> number
bonusXp({ challengeCompletions = [], recordImprovements = [], achievementUnlocks = [] } = {}) -> number
totalXp(sessions, { dayMap, challengeCompletions, recordImprovements, achievementUnlocks } = {}) -> number
levelFor(xp) -> { index, name, threshold, nextThreshold, progress }
LEVELS: [{ index, name, threshold }]              // 11 tiers per ADR-24

// src/lib/streak.js (wave-1 signature kept)
dayKey(ts) -> 'YYYY-MM-DD'                        // local, zero-padded
dayMap(sessions) -> Map<dayKey, { count, words }> // ascending
streakStats(dayMap, today) -> { current, longest, lastDay, activeToday }

// src/lib/achievements.js (wave-1 signature kept; catalog per ADR-24)
ACHIEVEMENTS: [{ id, title, description, category, rarity, requirement, hidden }]
evaluate(sessions, quizzes, { today, streakStats }) -> [{ ...def, unlocked, unlockedAt, progress:{current,target,pct} }]

// src/lib/challenges.js (new)
challengeFor(now, period: 'daily'|'weekly') -> { id, period, title, description, target, unit, xp }
challengeProgress({ sessions, quizzes }, { now }) -> { daily: ChallengeState, weekly: ChallengeState }
// ChallengeState = { id, period, periodStart, periodEnd, title, target, current, pct:0..100, complete, xp }

// src/lib/records.js (new)
personalRecords(sessions, { dayMap } = {}) -> [{ id, label, value, unit, at, sessionId?, day?, ties }]
recordImprovements(sessions, { dayMap } = {}) -> [{ id, at, value, previous, sessionId? }]

// src/lib/store.js v2 (supersedes ADR-2 §8 export freeze; import stays v1-compatible)
openStore() -> Promise<Store>                     // DB 'speedread' VERSION 2; stores: texts, quizzes, sessions, settings, profile
Store.put(store, rec) / get(store, id) / getAll(store) / del(store, id)
Store.exportAll() -> Promise<{ schemaVersion: 2, texts, quizzes, sessions, settings, profile }>
Store.importAll(json) -> Promise<{ ok:true } | { ok:false, error }>
// accepts schemaVersion 1|2; errors: 'schema-mismatch', 'invalid-field:<name>', 'invalid-record:<store>[i]', 'import-failed:<msg>'
// validate-before-clear; single readwrite transaction; duplicate ids deduped

// src/ui/dashboard.js render contract (additive; old shape stays valid)
createDashboard(root, { onStartSession, onExport, onImportJson, onAcceptWpm, onResumeSession } = {})
  -> { render({ sessions = [], suggestion = null, gamify = null, summary = null } = {}) }
// gamify = { xp, level, streak, dayMap, achievements, challenges, records, moments }
// summary = { sessionId, textTitle, wpm, comprehensionPct, words, elapsedMs, xpEarned, level, moments, suggestion, baseline }

// src/ui/gamify-cards.js (new)
xpCard({ xp, level }) -> Element
streakCard({ stats, dayMap, today }) -> Element
challengeCard({ daily, weekly }) -> Element
achievementGrid({ achievements, seen = [] }) -> Element
unlockMoment({ moments, onDismiss }) -> Element      // role="status"; dismissible; no focus steal

// src/ui/gamify-viz.js (new)
wpmChart({ sessions, maxPoints = 120 }) -> Element   // SVG via createElementNS inside this module
bestPodium({ sessions }) -> Element
recordsList({ records }) -> Element
```

Frozen unchanged (ADR-8 §8 + run 002): `h()`, `tokenize/chunk`, `splitSentences`, `orpIndex/orpParts`, `createPlayer/nextDelay`, `generateQuiz/scoreQuiz/normalizeAnswer`, `wpm/activeMs/comprehensionPct/summarize/sessionTicks/suggestNextWpm`, `renderAnswering/renderAuthoring` (ADR-12), `a11y.js` surface. `exportAll` shape is the only superseded freeze (ADR-23).

## 14. Data-model deltas (run 003; additive only, missing fields default, never filter)

```js
// sessions: no new required fields; resume snapshot lives in profile.activeSession (ADR-21).
//   Existing optional fields (chapterIndex/chapterTitle/drill) unchanged.
// texts +=
{ ..., favorite?: boolean }                    // product/06; default false, toggle writes the record
// quizzes: unchanged (ADR-12 shape preserved)
// settings: no new keys; existing keys unchanged (seenAchievements NOT added — binding 5)
// profile (new store, keyPath 'id', single record):
{ id: 'local', profileId: 'local', schemaVersion: 2,
  seenAchievements: string[],
  activeSession: null | { sessionId, textId, chapterIndex, chunkIndex, wpm, chunkSize, elapsedMs, startedAt, savedAt },
  uiPrefs: { libraryView?: 'list'|'grid', librarySort?: 'recent'|'title'|'progress', libraryFilter?: 'all'|'in-progress'|'completed'|'favorites' },
  createdAt: number, updatedAt: number }
// Export v2 = { schemaVersion:2, texts, quizzes, sessions, settings, profile }
```

## 15. File ownership map (run 003)

| Ticket | Files (exact) | Collision notes |
|---|---|---|
| product/01 visual-world | `design/direction.md`, `design/prototype.html` (new; HITL) | none — no `src/` edits |
| product/02 ia-flow | `index.html` (shell), `src/app.js` (`show`, `body.dataset.view`, resume banner wiring), `styles/app.css` S1 nav/responsive | `app.js`/`index.html`/`app.css` single-writer: this lands before gamify/06 |
| product/03 domain-persistence | `src/lib/events.js`, `src/lib/profile.js`, `src/lib/store.js`, `src/app.js` (boot + export/import), tests `test/{events,invariants}.test.js` + store harness | `store.js` frozen after this ticket; `app.js` before W4 |
| product/04 gamification-economy | `src/lib/xp.js`, `src/lib/streak.js`, `src/lib/achievements.js`, `src/lib/challenges.js`, `src/lib/records.js` + tests | pure libs; no view files |
| product/05 player-ux | `src/ui/player-view.js`, `src/app.js` (resume/restore + goal), `styles/app.css` S3 | after product/02 |
| product/06 library-ux | `src/ui/library.js`, `src/app.js` (import states, favorite), `styles/app.css` S2 | after product/02; shares `app.js` with 05/07 → sequential |
| product/07 feedback-loop | `src/ui/quiz-view.js`, `src/ui/dashboard.js`, `styles/app.css` S4/S5 | dashboard contract owner — gamify/06 consumes, never edits it |
| product/08 verification | `scripts/{a11y-checks,export-import,idb-failure,perf-large-book}.js` extensions, new `scripts/{dashboard-perf,security-checks,screenshots}.mjs`, `test/harness/*`, `docs/browser-checklist.md`, `.autoforge/validation/*` | owns final harness state; after W4 |
| gamify/01 xp | `src/lib/xp.js` + `test/xp.test.js` | same file as product/04 → product/04 is authority; gamify/01 is its execution ticket |
| gamify/02 streak | `src/lib/streak.js` + `test/streak.test.js` | idem |
| gamify/03 achievements | `src/lib/achievements.js` + `test/achievements.test.js` | idem |
| gamify/04 cards | `src/ui/gamify-cards.js`, `styles/app.css` `/* G1 */` section, `test/harness/gamify.html` | after W2 token restructure; append-only section |
| gamify/05 viz | `src/ui/gamify-viz.js`, `styles/app.css` `/* G2 */` section, `test/harness/gamify.html` | sequential after gamify/04 (shared app.css + harness) |
| gamify/06 integration | `src/app.js` (engine composition + HUD wiring), `index.html` (header HUD), `src/ui/dashboard.js` (consume contract only) | **added dependency: product/07** (contract owner); `app.js` single-writer after product/03 |
| gamify/07 gate | `scripts/a11y-checks.js`, `.autoforge/validation/e2e-walkthrough.mjs` extensions | after gamify/06; no feature work |

Shared files needing sequential waves: `src/app.js` (product/02 → 03 → 05/06/07 → gamify/06), `styles/app.css` (W2 rewrite → G1 → G2 → per-surface sections; single-writer per wave, named sections), `index.html` (product/02 → gamify/06), `src/ui/dashboard.js` (product/07 → gamify/06), `test/harness/*` (product/08 owns final state).

## 16. Traceability (run 003)

Mission §→ decision: §1 audit → discovery/report.md (done); §2–3 IA/target → ADR-21; §4 design system → ADR-26 (values PENDING product/01); §5 responsive → ADR-21 + ADR-26 + ADR-27; §6 library → ADR-21 + product/06; §7 player → ADR-21 + product/05; §8 quiz → ADR-25 + ADR-12; §9–11 gamification → ADR-24; §10 Trophy → ADR-24 + ADR-26 (grammar only, no dep); §12 animation → ADR-26; §13 persistence → ADR-23; §14 events → ADR-22; §15 dashboard → ADR-25; §16 achievements → ADR-24; §17 challenges → ADR-24; §18 records → ADR-24; §19 summary → ADR-25; §20 a11y → ADR-7 + ADR-26 + ADR-27; §21 browsers → ADR-27 + `docs/browser-checklist.md`; §22 perf → ADR-27 + binding 9; §23 security → ADR-23 + ADR-27 + binding 10; §24 import/export → ADR-23; §25 UX states → ADR-26; §26 grill design → binding decisions + ADRs 21–27; §27 implementation strategy → report.md §4 waves; §28 testing → ADR-27; §29 invariants → ADR-23 I1–I10 + ADR-24; §30–31 validation/exit → ADR-27 + `.autoforge/validation/report-003.md`; §32 deliverable → report.md.

Product tickets: 01→ADR-26 (PENDING values, HITL); 02→ADR-21; 03→ADR-22 + ADR-23; 04→ADR-24; 05→ADR-21 + ADR-26 (prototype specifics PENDING); 06→ADR-21 + §14 (`texts.favorite`); 07→ADR-25; 08→ADR-27.
Gamify tickets: 01→ADR-24 (constants superseded, file/signature kept); 02→ADR-24; 03→ADR-24; 04→ADR-26 + ADR-24 (rarity display); 05→ADR-25 (charts/downsampling) + ADR-26; 06→ADR-22 (profile supersedes `settings.seenAchievements`) + ADR-25 (dashboard contract) + ADR-21 (HUD); 07→ADR-27.
Binding decisions: 1→ADR-22; 2→ADR-22 + ADR-21 (id minting point); 3→ADR-24; 4→ADR-21 + ADR-25; 5→ADR-22 (+ supersession of gamify/06); 6→ADR-23; 7→ADR-27; 8→ADR-27; 9→ADR-25 + ADR-27; 10→ADR-27; 11→ADRs 21–27 (no-regression inventory re-asserted per wave); 12→report.md §4.
No contradiction with ADR-1 (all new modules plain ESM), ADR-2/6 (IDB only, `node --test`/CDP only), ADR-7 (a11y wins ties), ADR-8 (chunk policy untouched), ADR-10 (zero network; URL import remains user-triggered), ADR-12 (quiz split preserved), ADR-18 (copy rules extended, not weakened), ADR-19 (`:root`-only tokens, app.css consumes). Explicit supersessions: ADR-23 over the `schemaVersion:1` export freeze; binding 5 over gamify/06 `settings.seenAchievements`; ADR-24 constants over gamify/01–03 draft values.
