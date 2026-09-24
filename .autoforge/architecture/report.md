# Architecture Report — run speedreading-003 (product transformation)

Authority: user mission digest `.scratch/speedreading-product/spec.md` (§cited); binding orchestrator decisions `.autoforge/requirements/grilling.md` §"Orchestrator decisions"; wayfinder map `.scratch/speedreading-product/map.md`; gamify wave 1 `.scratch/speedreading-gamify/`. Constraints: ADR-1 (no build/deps/React), ADR-2/6 (IndexedDB + `node --test`/CDP), ADR-7 (a11y wins ties), ADR-8 (chunk policy), ADR-10 (zero network), ADR-12 (quiz split), ADR-18 (copy), ADR-19 (tokens `:root`-only, app.css consumes). No new runtime dependency. Existing functionality never removed. Single user; multi-user only as the minimal `profileId` seam.

Decisions: `.autoforge/architecture/decisions.md` §12 (ADR-21..27) + §13 freezes + §14 deltas + §15 ownership + §16 traceability.

## 1. Current state (from discovery/report.md + source skim)

- Composition root `src/app.js` (396 ln): 4 views (`index.html` sections), `show(name)`, in-memory `currentText/currentChapter/currentPlayer/currentSession`; writes `sessions` at end, amends on quiz save; alerts for failures; export/import via store.
- Pure libs: `text.js` (tokenize/chunk/splitSentences), `player.js` (deadline scheduler), `quiz.js` (seeded cloze), `metrics.js` (wpm/activeMs/summarize/sessionTicks/suggestNextWpm), `orp.js`, import pipeline (`pipeline/article/epub/docx/pdf/zip`), `store.js` (IDB v1, 4 stores, export v1).
- Views: `h.js`, `library.js`, `player-view.js` (incl. span drill), `quiz-view.js` (answering + authoring), `dashboard.js` (lap table + suggestion), `a11y.js` (announce/focusMain/reduced-motion).
- Tokens: 19 lines (folio/ink/marker/pencil/rule/oxblood + type + motion). `app.css` S1–S6 sections.
- Tests: 12 `node --test` files; CDP harnesses `scripts/{a11y-checks,export-import,idb-failure,perf-large-book}.js`, `.autoforge/validation/e2e-walkthrough.mjs` (530 ln), `test/harness/*.html` (6).
- Seams that already exist and are reused: `h()`, view `replaceChildren` roots, store wrapper, player engine events, metrics `sessionTicks`. Not built (do not pre-build): router, settings module, event bus, worker.

## 2. Target architecture

### 2.1 Layers and data flow (ADR-22)

```
UI action (library / player / quiz / dashboard)
  → app.js (composition root; ONLY writer of store + profile)
      → store.put facts (sessions | quizzes | texts | settings)     [append-only history]
      → profile.setActiveSession / markSeen / setUiPrefs            [profile seam, profileId='local']
  → derive (pure, on render):
      store.getAll → events.facts → engines (xp, streak, achievements, challenges, records)
                   → events.rewardMoments / sessionMoments
  → render contracts (dashboard.render({sessions, suggestion, gamify, summary}))
  → a11y announcements (role=status / live region), motion (reduced-motion branch)
```

Purity rules: `src/lib/*` never imports `src/ui/*`, never touches DOM at import time, never `fetch` (ADR-1 unchanged); `store.js` only IDB user; `profile.js` only profile-store user, store injected. UI modules import pure libs only for formatting/derivation; no reward logic in views. `app.js` is the only store/profile writer.

### 2.2 New modules

| Module | Responsibility | Notes |
|---|---|---|
| `src/lib/events.js` | projection: `facts()` + `rewardMoments()` + `sessionMoments()` | pure; imports xp/streak/achievements/challenges/records |
| `src/lib/profile.js` | repository seam over one `profile` record | `profileId='local'`; never throws; corrupt → defaults |
| `src/lib/xp.js` | session XP, daily caps, streak/challenge/record/achievement bonuses, level ladder | dependency-free |
| `src/lib/streak.js` | dayKey/dayMap/streakStats | wave-1 signature kept |
| `src/lib/achievements.js` | 26-item catalog + `evaluate()` | wave-1 signature kept |
| `src/lib/challenges.js` | daily/weekly catalog + `challengeProgress()` | deterministic local-calendar rotation |
| `src/lib/records.js` | `personalRecords()` + `recordImprovements()` | tie → earliest |
| `src/ui/gamify-cards.js` | xpCard/streakCard/challengeCard/achievementGrid/unlockMoment | `h()` only |
| `src/ui/gamify-viz.js` | wpmChart/bestPodium/recordsList (hand SVG) | no chart dep |

Store v2: `speedread` DB VERSION 2; additive `profile` store (ADR-23). Export `schemaVersion:2`; import accepts 1 and 2 (ADR-23 supersedes the ADR-2 `schemaVersion:1` freeze).

### 2.3 Session lifecycle and resumability (ADR-21)

`idle → ready → playing ⇄ paused → ending → quiz → summary → dashboard`. `sessionId` minted at player start (not at record time) so resume and idempotency share one key. `profile.activeSession` snapshot written on pause / tab hide / pagehide / exit-without-end; cleared on record and on quiz cancel. On boot: stale snapshot with a missing text is discarded silently; otherwise Library banner + Dashboard card offer Resume (paused, `seek(chunkIndex)`, accumulated `elapsedMs` seeded). Summary is a dashboard *state* (`render({summary})`), not a fifth view (binding 4). Player view hides shell nav + HUD while active (distraction-free; §7); Escape/Exit restores.

### 2.4 Economy (ADR-24, exact numbers)

Session XP = `floor(words/10)` (2nd+ same-text session same local day ×0.5) + comprehension bonus (+10 ≥60%, +20 ≥80%) + WPM-target +15 (requires comprehension ≥60%) ; session-source XP capped 500/local-day. Drill: `floor(words/20)`, no comprehension/WPM bonus, +1/correct recognition (max 20). Streak +10 per consecutive day beyond first, +50 per complete 7-day block. Challenge +50 daily / +150 weekly. Record improvement +30 (max 3/day). Achievement unlock +25. Level ladder 11 book-format tiers (0/100/300/700/1500/3000/6000/12000/24000/48000/96000 XP). All derived, monotonic in appended history (invariant I1).

### 2.5 Design system structure (ADR-26)

`tokens.css` gains role groups (`--color-*`, `--space-*`, `--radius-*`, `--elev-*`, `--control-h-*`, `--text-*`, rarity, motion) with the incumbent folio/ink/marker names preserved as aliases; `app.css` consumes only (ADR-19). Component inventory (mission §25 states) frozen as class contract. **Values PENDING product/01** — structure + slot-in points specified, no final colors/type.

### 2.6 Verification architecture (ADR-27)

`node --test` (unit + property invariants) + CDP harnesses (`e2e-walkthrough.mjs`, `scripts/*`) + new `scripts/{dashboard-perf,security-checks,screenshots}.mjs`. Chromium-only automation (binding 7) + `docs/browser-checklist.md` manual pass; screenshots reviewed by human, no pixel diff (binding 8); budgets: dashboard render <100ms @1000 sessions, chart ≤120 points, import <3s, Node tokenize/chunk <2s.

## 3. Alternatives considered and rejected

1. **Persisted XP ledger / event-sourcing with a durable event log** — rejected (binding 1): append-only session+quiz history already is the log; a second store doubles write paths and migration surface. Tombstones deferred until session deletion exists.
2. **Separate summary view/route** — rejected (binding 4): nav stays 4 items; summary is dashboard state.
3. **Persisted streak/achievement state** — rejected: derived; only `seenAchievements` (UI memory) persists in `profile`.
4. **New settings keys for gamification** — rejected: `settings.seenAchievements` (gamify/06) is superseded by `profile.seenAchievements` (binding 5); settings record otherwise untouched.
5. **Charting/utility dependency, workers, virtualization** — rejected (ADR-1 + no measured miss; ADR-17 posture).
6. **Bottom-tab nav as new DOM shell** — rejected: keep existing 4 header buttons; mobile collapse is CSS-only (fixed tab bar <768px), so nav routing tests and keyboard order survive.
7. **Per-question immediate quiz feedback** — rejected: changes the scoring loop and ADR-12 boundaries; deferred review state gives the same states (correct/incorrect/skipped) post-submit.

## 4. Execution waves and collisions

- W1 engines (after product/04): gamify 01/02/03 → `xp.js`/`streak.js`/`achievements.js` + tests. Product/04 also emits `challenges.js`/`records.js`.
- W2 design system + shell (after product/01/02): tokens v2 + shell/nav + primitives; then gamify 04/05 against frozen tokens.
- W3 domain + persistence (after product/03): `events.js`, `profile.js`, store v2, export/import v2; then gamify 06 integration.
- W4 surfaces (after 02/05/06/07 + W2): library, player, quiz+summary+dashboard, each with verification (mission §27).
- W5 animation/a11y/responsive/hardening/polish (after 07/08 + W4): gamify 07 gate, product 08, mission §28–31.

Collisions (single-writer, sequential): `src/app.js` (W2 shell → W3 boot/import-export → W4 flows → gamify/06); `styles/app.css` (W2 rewrite of S1–S6 → gamify G1/G2 append → W4 per-surface sections); `index.html` (product/02 nav → gamify/06 header HUD); `src/ui/dashboard.js` (product/07 contract → gamify/06 consumes); `test/harness/*` + `scripts/*` (product/08 owns final). gamify/06 gains a dependency on product/07 (contract owner) — recorded in §15.

## 5. Top risks

1. **Resume correctness** — snapshot/restore can double-count elapsed time or lose chunk position. Mitigate: single writer (`app.js`), snapshot on pause/hide/pagehide only, resume test in walkthrough + `activeMs` accumulation test.
2. **Economy monotonicity** — daily caps/repeat factors can silently break "XP never decreases". Mitigate: property test I1 over generated append sequences (invariants.test.js).
3. **Migration/data integrity** — v1→v2 upgrade + import v1/v2 validation must never lose user data. Mitigate: additive `onupgradeneeded`, validate-before-clear preserved, v1-import E2E, corrupt-profile recovery test.
4. **app.css/tokens collision** — W2 token restructure vs gamify G1/G2 appends. Mitigate: strict wave order + named section ownership (§15); tokens `:root`-only grep stays.
5. **Summary/reward scope creep** — every engine firing at once recreates noise the mission bans. Mitigate: fixed priority order + max 1 hero + ≤3 compact (ADR-25), consolidated single announcement.

## 6. PENDING (HITL)

- **product/01 visual world**: final color/type/spacing/motion *values*; prototype reaction. Structure and slot-in points frozen in ADR-26; incumbent folio/ink/marker is the default posture.
- **product/05 player UX / product/06 library UX**: prototype interaction specifics (control layout, density) beyond the frozen contracts in ADR-21/25/26.
- Cross-browser manual checklist results (docs/browser-checklist.md) and screenshot review are human evidence, not automated.

## 7. Traceability

Mission §1–§32 → ADR/decision mapping and per-ticket mapping: decisions.md §16. No source edits in this stage; no ADR-1/2/6/7/8/10/12/18/19 conflict (ADR-23 supersedes only the `schemaVersion:1` export freeze; binding 5 supersedes gamify/06's `settings.seenAchievements`).
