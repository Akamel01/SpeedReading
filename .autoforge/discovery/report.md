SpeedReading: current-state discovery audit (wave 3) – umbrella overview

- Functionality + flows (user-facing paths):
  - Import via library view (file) – flow defined in src/ui/library.js (onImportFile) [src/ui/library.js:171-183].
  - Import via URL in library view – flow (onImportUrl) handles URL validation, fetch, and article/book ingestion [src/ui/library.js:189-206][src/ui/library.js:219-251].
  - Open text in library (chapter pick) triggers currentText/currentChapter setup, chunking, and starting the RSVP player [src/app.js:88-119][src/app.js:121-128].
  - Session end triggers recordSession + quiz flow start; after quiz, dashboard rendering path [src/app.js:266-271][src/app.js:315-321].
  - Quiz flow (score, persist) via quizView.start + onSave; dashboard accepts WPM suggestion [src/app.js:286-327].
  - Dashboard -> Start session, import/export data; data export/import routed through store (exportData/importData) [src/app.js:329-341][src/app.js:343-351].
  - Persistence surface: IndexedDB wrapper with 4 stores (texts, quizzes, sessions, settings) and schema versioning [src/lib/store.js:4-5][src/lib/store.js:14-16][src/lib/store.js:58-66][src/lib/store.js:77-83].

- Architecture + data model:
  - Module inventory: 4 stores; Import direction: UI -> lib; lib is DOM-free except for store usage [src/lib/store.js:4-5].
  - Data shapes: texts, quizzes, sessions, settings; keys = id; store API exposes put/getAll/get/exportAll/importAll [src/lib/store.js:4-5][src/lib/store.js:58-66][src/lib/store.js:77-83][src/lib/store.js:85-93].
  - Session data model: see app.js where currentSession is assembled (id, kind, textId, chapterIndex, chapterTitle, chunkSize, targetWpm, startedAt, endedAt, wordCount, elapsedMs, wpm, quizId, correct, total, comprehensionPct, drill) [src/app.js:135-153].
  - Export/Import surfaces: exportAll() returns { schemaVersion, texts, quizzes, sessions, settings }; importAll validates schemaVersion and replaces stores [src/lib/store.js:77-83][src/lib/store.js:87-110].
  - Frozen interfaces (ADR-8 §8): the core surface contracts are deliberately immutable (h.js, splitSentences, sessionTicks, etc.) as documented in the architecture decisions [.autoforge/architecture/decisions.md:141-159].

- Visual system:
  - Shell assets come from index.html; CSS is sourced from styles/tokens.css and styles/app.css (linked in index.html) [index.html:7-9].
  - Tokens define color family and motion constants; app.css consumes tokens and implements UI strata S1..S6, including accessibility and motion rules (S2 shelf, S3 page, S4 quiz, S5 dashboard, S6 motion) [styles/tokens.css:1-9][styles/app.css:1-3].
  - The shell in index.html demonstrates the four views (#view-library, #view-player, #view-quiz, #view-dashboard) per contract [index.html:29-40].

- State model:
  - UI state lives in an app-wide composition root in src/app.js with local vars (currentText, currentChapter, currentChunkSize, currentPlayer, …) and per-view state (settings, sessionOpen, quizActive) [src/app.js:55-66][src/app.js:58-66].
  - State persistence: settings are saved to IndexedDB via store.put in persistSettings and loaded at boot [src/app.js:68-75][src/app.js:51-55].
  - Non-persisted state: interrupted sessions, transient player rail ticks, per-chunk readEvents, and in-memory UI toggles are not written to the DB (ephemeral state) [src/app.js:65-67][src/app.js:125-131].

- Tests + tooling:
  - Core libraries are validated with node --test across multiple files (metrics, pipeline, text, quiz). Examples: test/metrics.test.js, test/pipeline.test.js, test/text.test.js, test/quiz.test.js, test/article.test.js, test/pdf.test.js, test/epub.test.js, test/zip.test.js; recent runs show passing results for each file (e.g., metrics.test.js reported 16 tests, pass) [test/metrics.test.js:5-5].
  - CDP/DOM harnesses live under test/harness and test/scripts (a11y-checks.js, idb-failure.js, export-import.js, perf-large-book.js) to exercise accessibility, persistence and perf gates in a headless browser environment [scripts/a11y-checks.js:4-4][scripts/idb-failure.js:3-4][scripts/export-import.js:2-4].

- Gap analysis vs mission exit conditions (condensed):
  - Design system: tokens/design direction defined; visual system in tokens/app.css; see ADRs in .scratch and .autoforge decisions (ADR-19/20) [.autoforge/architecture/decisions.md:161-158][styles/tokens.css:1-9].
  - Library/Player/Quiz/Dashboard: IO flows exist in app.js and UI modules; tests cover core lib modules and UI harnesses [src/app.js:171-181][src/ui/library.js:108-115][src/ui/player-view.js:286-316][src/ui/quiz-view.js:13-27].
  - Persistence lifecycle: v1 stores; no migrations yet (ADR-2) and no settings-seenAchievements persistence (spec.md) [src/lib/store.js:14-23][.scratch/speedreading-product/spec.md:16-18].
  - Gamification: XP/levels/streaks/achievements are planned via wave 1 tickets; integration with UI is defined but not yet wired in app.js until ticket gates pass [.scratch/speedreading-gamify/map.md:6-13].

- Technical debt / duplication (top items):
  - In-memory UI state captured in app.js; consider moving to a small domain surface for testability [src/app.js:55-66].
  - Repeated DOM construction in UI adapters (h.js usage) with potential to centralize patterns [src/ui/library.js:9-21].
  - Alert usage in import error paths (app.js) – could be normalized into a surfaced error UI [src/app.js:186-187].
  - No profile layer yet, future multi-user support gated by ADR-20; current single-user design is explicit [.autoforge/architecture/decisions.md: Wisely notes for multi-user gaps].

- Baseline: run a static server and verify a minimal page renders; the ADR.md baseline describes python3 -m http.server 8080 as the run method [.autoforge/architecture/decisions.md:12-13]. The repo index.html shows static shell with four views and a module script to app.js [index.html:7-9][index.html:42-44].

- Unknowns / risks (top 8 with evidence):
  1) Cloud/multi-user plan not implemented (design-for-later). Evidence: ADR-20 and repo notes state no cloud sync in scope [.autoforge/architecture/decisions.md:133-136][.scratch/speedreading-product/spec.md:15-18].
  2) Migration path for v1 to v2 data model not implemented; potential data-loss risk if migration is needed later [.autoforge/architecture/decisions.md:14-16].
  3) Zero-network posture asserted (no telemetry); verification relies on offline tests; risk of drift if a backend sneaks in [.autoforge/architecture/decisions.md:63-66].
  4) Design policy locked (no runtime deps) may conflict with future features; risks of scope creep vs YAGNI (ADR-1) [.autoforge/architecture/decisions.md:8-12].
  5) Accessibility and performance gates rely on harnesses; if harnesss fail, uncovered gaps exist (ticket ADR-7/ADR-18) [.scratch/speedreading-product/issues/01-visual-world.md: ADR-7 gating; ADR-18 timing] 
  6) Data integrity on import/export is manual; requires strict validation; currently schemaVersion 1 only (expansion future) [src/lib/store.js:77-83][.scratch/speedreading-product/spec.md:17-23].
  7) Cross-browser validation not yet demonstrated beyond chrome headless harness; no browser matrix documented (ADR-21 hypothetical) [index.html and app.css mention browser support; no explicit matrix].
  8) Visual-system drift risk after wave 1; tokens and design direction frozen but future waves may change tokens/brand; documented in ADRs [.autoforge/architecture/decisions.md:160-161].

- Tickets: OPEN tickets across product + gamify (summary):
  - product/01 visual-world.md – OPEN (ready-for-human) – blocked by none [.scratch/speedreading-product/issues/01-visual-world.md:5-7].
  - product/02 ia-flow.md – OPEN (ready-for-agent) – blocked by none [.scratch/speedreading-product/issues/02-ia-flow.md:5-7].
  - product/03 domain-persistence.md – OPEN (ready-for-agent) – blocked by none [.scratch/speedreading-product/issues/03-domain-persistence.md:5-7].
  - product/04 gamification-economy.md – OPEN (ready-for-agent) – blocked by 03 events [.scratch/speedreading-product/issues/04-gamification-economy.md:7-8].
  - product/05 player-ux.md – OPEN (ready-for-human) – blocked by 01 [.scratch/speedreading-product/issues/05-player-ux.md:5-7].
  - product/06 library-ux.md – OPEN (ready-for-human) – blocked by 01 [.scratch/speedreading-product/issues/06-library-ux.md:5-7].
  - product/07 feedback-loop.md – OPEN (ready-for-agent) – blocked by 04 [.scratch/speedreading-product/issues/07-feedback-loop.md:5-7].
  - product/08 verification.md – OPEN (ready-for-agent) – none [.scratch/speedreading-product/issues/08-verification.md:5-7].
  - gamify/01 xp-levels.md – OPEN (ready-for-agent) – none [.scratch/speedreading-gamify/issues/01-xp-levels.md:9-10].
  - gamify/02 streak.md – OPEN (ready-for-agent) – none [02-streak.md].
  - gamify/03 achievements.md – OPEN (ready-for-agent) – none [03-achievements.md].
  - gamify/04 gamify-cards.md – OPEN (ready-for-agent) – blocked by 01-03, product/01 [04-gamify-cards.md:7-8].
  - gamify/05 gamify-viz.md – OPEN (ready-for-agent) – blocked by 04 [05-gamify-viz.md:7-9].
  - gamify/06 integration.md – OPEN (ready-for-agent) – blocked by 01-04-05 [06-integration.md].
  - gamify/07 gamify-gate.md – OPEN (ready-for-agent) – blocked by 06 [07-gamify-gate.md].

- Wave 1 prior discovery (summary): wave 1 gates executed after product tickets close; prior discovery is captured in the wave map and decisions log (e.g., speedreading-product/map.md) with a 3-line note at the end of this section. See map.md for wave boundaries and execution order [.scratch/speedreading-product/map.md:6-13].

Notes: this is the umbrella audit for speedreading-003; the wave 1 gamify execution is superseded by this broader audit and will be reflected in the tracker once tickets are closed.

Evidence and references (file:line) used above:
- Import flows: src/ui/library.js [171-183], [189-206], Open Text: src/app.js [88-119], Export/Import: src/app.js [343-351], [353-361] and store API: src/lib/store.js [58-66], [77-83].
- Data model and stores: src/lib/store.js [4-5][14-16][21-23], app.js session fields [135-153].
- Frozen interfaces: .autoforge/architecture/decisions.md [141-159].
- Visual system: index.html [7-9][29-40], styles tokens/app.css [styles/tokens.css:1-9][styles/app.css:1-3].
- Baseline: ADR-1 baseline recommendation [.autoforge/architecture/decisions.md:12-13].
- Test harnesses: scripts/a11y-checks.js, scripts/idb-failure.js, scripts/export-import.js [scripts/...:1-6], test/*.test.js files. 

3-line note: wave 1 prior discovery is recorded in speedreading-product/map.md end-of-section notes. See map.md for wave boundaries.
