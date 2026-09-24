# Plan — run speedreading-003 "full product transformation" (v1.1, critic fixes incorporated)

Scope: `/Users/akamel/Documents/SpeedReading`. Overwrites run-002 plan (proven format kept).
Authority: `.autoforge/discovery/tracker-index.md` (15 frontier entries) + `.autoforge/architecture/decisions.md`
ADR-21..27, §13 interface freezes, §14 data-model deltas, §15 file ownership map, §16 traceability +
`.autoforge/requirements/grilling.md` §"Orchestrator decisions (binding)" + `map.md` §Execution workstreams.
v1.1 incorporates independent critic review `.autoforge/reviews/plan-003.md` (B1, B2, M1–M6, accepted minors; rejected minors noted in §"Critic disposition").

**Notation:** in this plan `§N` = mission section (`spec.md`); `ADR §N` = section of `decisions.md`.

## Execution rules (apply to every module)

- **Verify loop (mission §27), mandatory per module:** `node --check` every touched JS file → `node --test test/` green →
  run the module's targeted harness/walkthrough command → inspect output/screenshots → fix → re-run → then review.
  No unverified accumulation; a module is not "done" until its acceptance command is green and the reviewer has signed off.
- **No-regression subsets** (grilling decision 11) are listed per module; the listed subset is re-asserted in that module's acceptance.
- **No push, no deploy.** The run ends at validation (ADR-27 evidence + `.autoforge/validation/report-003.md`).
  No RS7-style release gate unless the human explicitly asks.
- **Scheduler contract (critic B1):** `HC-A` and `HC-B` are first-class pseudo-nodes in every gated module's `blocked_by`;
  a scheduler that topologically sorts `blocked_by` alone must not dispatch a gated module until the checkpoint resolution is recorded.
  `gated_by_checkpoint` is informational only. Human resolution = recorded APPROVE/CHANGES in the checkpoint artifact.
- **Shared-file single-writer chains:**
  `src/app.js`: P02 → P03A → P05B → P06B → P07B → G06.
  `styles/app.css`: S1 (P02) → base/primitives/S6 (P01B) → G1 (G04) → G2 (G05) → S3 (P05B) → S2 (P06B) → S4 (P07A) → S5 (P07B).
  `index.html`: P02 → G06. `src/ui/dashboard.js`: P07B owns the contract; G06 consumes without editing.
- **app.css section→owner table (critic B2; extends ADR-19 §10 for run 003):**

  | Section | Owner | Note |
  |---|---|---|
  | S1 header/nav/responsive-nav | M-P02 | |
  | base + component primitives | M-P01B | ADR-26 inventory |
  | S6 motion/fallbacks/responsive | M-P01B | reconciled with ADR-26 motion system + breakpoints; S1 preserved |
  | G1 gamify cards | M-G04 | |
  | G2 gamify viz | M-G05 | |
  | S3 player/rail/setup | M-P05B | |
  | S2 library | M-P06B | |
  | S4 quiz | M-P07A | |
  | S5 dashboard | M-P07B | |

- **Custom-property rule (critic minor 13, resolves ADR-19 ambiguity):** custom properties live in `styles/tokens.css` only;
  `app.css` declares none anywhere (grep-enforced). A section that needs a local variable promotes it to a tokens.css role.
- **Harness runner contract (critic M2):** `scripts/harness-run.mjs <page> [--assert] [--shot <out.png>]` is the zero-dep
  CDP runner for `test/harness/*.html` pages. Introduced by M-P03A (first harness producer), used by M-P01B/M-G04/M-G05,
  final owner M-P08A. Every harness acceptance names its exact command.
- **Walkthrough is append-only** per module in the sequential order P02 → P03A → P05B → P06B → P07A → P07B → G06 → G07 → P08A (final consolidation);
  P08A owns the final harness state (ADR §15).
- **Splits** (01, 03, 05, 06, 07, 08) are each cited below; every ticket is owned exactly once (§Coverage).
  Contingency: if M-P03A or M-P06B overruns one worker session, split at the stated line (cited in module) rather than extending the session.

## Module index

| Wave | Modules |
|---|---|
| W1 foundations/engines | M-P01A, M-P02, M-G01, M-G02, M-G03, M-P04 → then M-P03A, M-P03B, M-P05A, M-P06A |
| W2 design system + gamify surfaces | M-P01B → M-G04 → M-G05 |
| W3 domain + persistence | M-P03A, M-P03B (scheduled in W1b — disjoint, dependency-ready; map order preserved) |
| W4 surface redesign | M-P05B → M-P06B → M-P07A → M-P07B |
| W5 integration + gates + validation | M-G06 → M-G07 → M-P08A → M-P08B |

---

## W1 — foundations, engines, prototypes, persistence

### M-P01A visual-direction-prototype (product/01, ADR-26; HITL prototype) — human_gate
- Objective: build the cheap concrete prototype and freeze the direction: Candidate A default (preserve + expand incumbent folio/ink/marker into full material/state/motion system); replacement only if the prototype proves it wrong (map.md Notes).
- Inputs: `issues/01-visual-world.md`, ADR-26 (role names/structure), ADR-7/10/19 constraints, mission §4 bans.
- Outputs: `design/direction.md` (value table keyed by ADR-26 role names **plus run-003 additions `--icon-sm|md|lg` and `--container-sm|md|lg|full`** — mission §4 requires icon sizes and container widths; type/space/radius/elevation/control-height/breakpoint/focus/motion tables; signature element; anti-references; Trophy→product mapping table incl. refusals), `design/prototype.html` (shell + player + one gamification surface + dashboard fragment; zero deps).
- touches: [`design/direction.md`, `design/prototype.html`]
- blocked_by: []
- Acceptance: `python3 -m http.server 8080` → `/design/prototype.html` renders all four regions at 390px/1280px with no horizontal overflow; direction doc defines **every** ADR-26 role name **and** the `--icon-*`/`--container-*` additions (grep doc role list); contrast pairs listed with computed ratios ≥4.5:1 (ADR-7); zero network requests after load (ADR-10); prototype direction kept swappable (single small CSS block) for the HC-A rework path (critic M6); **human reaction recorded in ticket 01 Resolution** (APPROVE / CHANGES list). Reviewer: human (required).
- No-regression: ADR-7 contrast, ADR-10 zero network. Skills: [`frontend-design`, `taste`].

### M-P02 ia-shell (product/02, ADR-21)
- Objective: shell/nav + routing/state surfaces: persistent header + nav (≥768px row; <768px fixed bottom tab bar, CSS-only, same DOM/order, ≥44px targets, safe-area); `show()` sets `document.body.dataset.view`; player view hides nav+HUD (focus mode) and restores on exit; corrupted-data shell banner (readable + Retry) on store-open/load failure; shell-owned rows of the 21-state table wired.
- Inputs: `issues/02-ia-flow.md`, ADR-21 (state table, lifecycle), existing `index.html:29-44`, `app.js:30-46`.
- Outputs: `index.html` (real nav/header DOM), `src/app.js` (`show()` dataset + focus-mode attribute + boot failure path), `styles/app.css` (S1 nav/responsive only).
- touches: [`index.html`, `src/app.js`, `styles/app.css`, `.autoforge/validation/e2e-walkthrough.mjs`]
- blocked_by: []
- Acceptance: walkthrough steps (CDP): 4 views retained; `body.dataset.view` per view; nav row at 1280px / bottom tabs at 375px (≥44px targets); player view hides chrome and restores; **corrupted-data banner simulated via CDP deleting the `speedread` DB before boot (or stubbing `openStore` rejection) — mechanism named in the module report**; zero network requests after load re-checked (ADR-10); fallbacks (Player→library, Quiz→library) intact. No-regression: ADR-12 split, ADR-5 timing, ADR-11 attribution, ADR-10 zero network; `node --test test/` green. Reviewer: agent.

### M-G01 xp-engine (gamify/01, ADR-24 constants)
- Objective: `src/lib/xp.js` per ADR §13 freeze + ADR-24 values: `sessionXp/sessionsXp/streakXp/bonusXp/totalXp/levelFor/LEVELS`; daily session cap 500; same-text same-day repeat ×0.5; comprehension +10/+20; target+comprehension +15; drill `floor(wordCount/20)` + recognition ≤20/session; 11-tier ladder (Leaflet 0 … Library 96000, clamp at max); malformed → 0, never throws.
- Inputs: `issues/01-xp-levels.md` (gamify), ADR-24 XP/level tables, ADR §13.
- Outputs: `src/lib/xp.js`, `test/xp.test.js`.
- touches: [`src/lib/xp.js`, `test/xp.test.js`]
- blocked_by: []
- Acceptance: `node --test test/xp.test.js` (empty→0; monotonic in words; daily cap; repeat factor; comprehension/target bonuses; drill rate; worked example 1000w/75%/target-met → 125 XP and same-text 2nd → 75 XP; exact level boundaries + max clamp; **`streakXp`/`bonusXp` cases per ADR-24: +10 per consecutive day beyond first, +50 per complete 7-day block boundary, challenge once/period (+50/+150), record improvements max 3/day (90), achievement +25 once (critic minor 5)**; malformed no-throw) + `node --check src/lib/xp.js`. Reviewer: agent. Skills: [`tdd`].

### M-G02 streak-engine (gamify/02, ADR-24)
- Objective: `src/lib/streak.js` per ADR §13: `dayKey` (local, zero-padded), `dayMap` (ascending), `streakStats(dayMap, today)`; injected `today`; malformed skipped.
- Inputs: `issues/02-streak.md` (gamify), ADR-24 (I4: day counts once).
- Outputs: `src/lib/streak.js`, `test/streak.test.js`.
- touches: [`src/lib/streak.js`, `test/streak.test.js`]
- blocked_by: []
- Acceptance: `node --test test/streak.test.js` (empty; same-day multiple sessions = 1 day; consecutive run; gap breaks; yesterday-only alive; month/year boundary; injected today; I4) + `node --check`. Reviewer: agent. Skills: [`tdd`].

### M-G03 achievements-engine (gamify/03, ADR-24 catalog)
- Objective: `src/lib/achievements.js` per ADR §13: `ACHIEVEMENTS` (exact 26-entry catalog per ADR-24: id/title/category/rarity/requirement/hidden **plus `glyph` text field — mission §16 icon/badge requirement; badge art deferred, text glyph is the delivered form**) + `evaluate(sessions, quizzes, {today, streakStats})` → unlocked/unlockedAt (earliest qualifying event)/progress 0..100 clamped; drill exclusion for comprehension/speed; no imports from xp/streak.
- Inputs: `issues/03-achievements.md` (gamify), ADR-24 catalog table, mission §16.
- Outputs: `src/lib/achievements.js`, `test/achievements.test.js`.
- touches: [`src/lib/achievements.js`, `test/achievements.test.js`]
- blocked_by: []
- Acceptance: `node --test test/achievements.test.js` (26 unique ids; **every entry has a non-empty `glyph`**; each boundary; hidden renders locked; drill never unlocks speed/comprehension stamps; pct clamps; deterministic order; malformed no-throw) + catalog-vs-ADR-24 review + `node --check`. Reviewer: agent. Skills: [`tdd`].

### M-P04 economy-libs (product/04, ADR-24)
- Objective: economy libs not covered by gamify 01–03: `challenges.js` (daily rotation `daySerial % 3`, weekly Monday-start `weekIndex % 3`, local date-part arithmetic — DST-safe, never fixed-ms; `challengeProgress` derived without UI open; completed periods monotonic) and `records.js` (**exact 10 record ids**: `fastest-wpm`, `best-comprehension`, `best-combined`, `longest-session`, `most-words-day`, `most-sessions-day`, `longest-streak`, `fastest-wpm-chunk-1`, `fastest-wpm-chunk-2`, `fastest-wpm-chunk-3`; ties → earliest `at`; drill exclusions per ADR-24); resolution records that constants/catalog match ADR-24.
- Inputs: `issues/04-gamification-economy.md`, ADR-24 challenges/records tables, ADR §13.
- Outputs: `src/lib/challenges.js`, `src/lib/records.js`, `test/challenges.test.js`, `test/records.test.js`.
- touches: [`src/lib/challenges.js`, `src/lib/records.js`, `test/challenges.test.js`, `test/records.test.js`]
- blocked_by: [] (tracker says "03 events"; real edge none — ADR-22/24 froze names/payloads, libs are pure with injected inputs; noted as a documented inversion).
- Acceptance: `node --test test/challenges.test.js test/records.test.js` (rotation determinism incl. DST-boundary fixture; period reset via injected `now`; drill exclusions; tie rules; caps; **all 10 record ids present exactly once**; no-throw) + `node --check` both. Reviewer: agent. Skills: [`tdd`].

### M-P03A persistence-v2 (product/03 part 1, ADR-23)
- Objective: store v2 (`VERSION 2`, additive `profile` store, export `{schemaVersion:2,...,profile}`, import accepts 1|2, validate-before-clear, dup-id dedupe, error strings `schema-mismatch|invalid-field|invalid-record|import-failed`) + `profile.js` repository (ADR §13 surface; corrupt → defaults + `{recovered:true}`) + `app.js` boot/export/import rewiring + resume snapshot write path (pause/visibilitychange/pagehide/exit; cleared on record/quiz-cancel; boot resume candidate) + **the harness runner `scripts/harness-run.mjs` (introduced here, final owner M-P08A)**.
- Inputs: `issues/03-domain-persistence.md`, ADR-23, ADR §13 freezes, §14 profile shape.
- Outputs: `src/lib/store.js`, `src/lib/profile.js`, `src/app.js` (boot/export/import + snapshot), `test/harness/store-v2.html`, `scripts/harness-run.mjs`.
- touches: [`src/lib/store.js`, `src/lib/profile.js`, `src/app.js`, `test/harness/store-v2.html`, `scripts/harness-run.mjs`, `.autoforge/validation/e2e-walkthrough.mjs`]
- blocked_by: [M-P02]
- Acceptance: `node scripts/harness-run.mjs test/harness/store-v2.html --assert` (exact command): fresh DB VERSION 2; v1 fixture upgrade additive (data intact); v2 export shape; v1 import wrapped into v2 defaults; v3 rejected readably; malformed record → `invalid-record:<store>[i]`; dup ids deduped; corrupt profile → defaults+recovered; **upgrade-abort case: simulate `onupgradeneeded` failure → `openStore()` rejects, v1 fixture still readable, shell renders corrupted-data state (critic M5)**; import quota/abort → error + data intact; **I5 seen-marking idempotency (`markSeen` twice → same state; critic minor 6)**; I6/I10. Walkthrough step: pagehide writes `profile.activeSession`, record clears it. No-regression: ADR-2 v1 import acceptance, ADR-15 failure line, ADR-10 zero network; `node --test test/` green. Reviewer: agent. Skills: [`tdd`, `migration`].
- Contingency: if the session overruns, split `scripts/harness-run.mjs` + `test/harness/store-v2.html` from the store/profile/app.js work (cited; both halves keep this ticket).

### M-P03B events-composition (product/03 part 2, ADR-22)
- Objective: `src/lib/events.js` pure per ADR §13 freeze: `facts()`, `rewardMoments()`, `sessionMoments()`; imports xp/streak/achievements/challenges/records; facts sorted `(at, key)`, keys unique, malformed skipped; `sessionMoments` only the just-completed session; priority 1–5 (record → achievement → level → challenge → streak); `session.quiz_completed` only when a quiz record matches the session. I3's app-path test is owned by M-P07A (noted; critic minor 6).
- Inputs: ADR-22 event table + ADR §13, ADR-23 I1/I2/I7 statements.
- Outputs: `src/lib/events.js`, `test/events.test.js`, `test/invariants.test.js`.
- touches: [`src/lib/events.js`, `test/events.test.js`, `test/invariants.test.js`]
- blocked_by: [M-G01, M-G02, M-G03, M-P04] (real: static imports of the five economy libs)
- Acceptance: `node --test test/events.test.js test/invariants.test.js` (facts ordering/uniqueness/malformed-skip; attribution; priority order; I1 XP monotonic / I2 no double award / I7 level↔XP round-trip via deterministic PRNG). Reviewer: agent. Skills: [`tdd`].

### M-P05A player-prototype (product/05, ADR-21/26; HITL prototype) — human_gate
- Objective: player prototype + written interaction spec: progressive disclosure (WPM/progress/elapsed/remaining/section), control model (pause/resume/restart/skip, speed steps, keyboard map, touch targets), modes (focus/fullscreen, SR manual advance, reduced motion, typography, chunk size incl. experimental 3), session goals, interruption/restore against ADR-21, transitions, rail fate.
- Inputs: `issues/05-player-ux.md`, `design/direction.md` (M-P01A), ADR-5/7/8/18 constraints.
- Outputs: `design/player-prototype.html`, `design/player-ux.md` (state × control matrix, keyboard map, motion notes).
- touches: [`design/player-prototype.html`, `design/player-ux.md`]
- blocked_by: [M-P01A]
- Acceptance: prototype servable at `/design/player-prototype.html`; holds 320px + ultrawide; spec covers every ticket bullet; keyboard map complete; **direction kept swappable (single small CSS block) for the HC-A rework path (critic M6)**; **human reaction recorded in ticket 05 Resolution**. Reviewer: human (required).
- No-regression: spec must preserve ADR-5 timing, ADR-7 announcements-at-sentence-boundaries, ADR-8 chunk policy, ADR-18 copy. Skills: [`frontend-design`, `taste`].

### M-P06A library-prototype (product/06, ADR-21/26; HITL prototype) — human_gate
- Objective: library prototype + interaction spec: workspace layout (header/search/filter/sort/density), per-item surface (identity, word count, est. time, progress, completion, last session, mastery, favorite, contextual actions), import workflow states (idle→dragging→parsing→success→failure + recovery + duplicates + rights copy), empty states (first-use/no-results/all-filtered), mobile collapse, delete/confirm/undo posture.
- Inputs: `issues/06-library-ux.md`, `design/direction.md` (M-P01A), ADR-10/11/23 constraints.
- Outputs: `design/library-prototype.html`, `design/library-ux.md` (layout per breakpoint, state table, copy inventory).
- touches: [`design/library-prototype.html`, `design/library-ux.md`]
- blocked_by: [M-P01A]
- Acceptance: prototype servable at `/design/library-prototype.html`; every existing import path represented (txt/md/epub/docx/pdf, paste, URL+fallback, JSON); **direction kept swappable (single small CSS block) for the HC-A rework path (critic M6)**; **human reaction recorded in ticket 06 Resolution**. Reviewer: human (required).
- No-regression: ADR-10 rights copy, ADR-11 chapter picker surface preserved, security posture (§23). Skills: [`frontend-design`, `taste`].

---

## W2 — design system + gamification surfaces (app.css single-writer chain)

### M-P01B design-system-implementation (product/01 execution, ADR-26)
- Objective: fill ADR-26's frozen structure with M-P01A values — **values only, no structural edits**: `tokens.css` role groups (color incl. `--color-xp`/`--rarity-*`, type/leading/weight, space 4px scale, radius, elevation, control heights 32/40/48, **`--icon-*`/`--container-*` (run-003 additions per mission §4)**, motion incl. `--dur-reward`, focus, incumbent-name aliases) + `app.css` base, component-primitive sections for the full ADR-26 inventory (`.btn/.field/.check/.switch/.card/.row/.badge/.stamp/.stat/.progress/.chart/.table/.empty/.skeleton/.banner/.dialog/.sheet/.toast/.status/.tabs/.nav-item/.calendar`) with the required state set + motion primitives per ADR-26 (press 100 / status 150 / view 180 / reward ≤320; reduced-motion → opacity-only) + **S6 motion/fallbacks/responsive reconciled with ADR-26 (breakpoints 320…1920; S1 nav preserved)**.
- Inputs: `design/direction.md` (M-P01A), ADR-26, ADR-19 discipline.
- Outputs: `styles/tokens.css`, `styles/app.css` (base + primitives + S6; S1 preserved), `test/harness/components.html`, `.autoforge/validation/checkpoint-b/components-{390,1280}.png`.
- touches: [`styles/tokens.css`, `styles/app.css`, `test/harness/components.html`]
- blocked_by: [M-P01A, M-P02, HC-A]
- Acceptance: `node scripts/harness-run.mjs test/harness/components.html --assert --shot .autoforge/validation/checkpoint-b/components-390.png --shot .autoforge/validation/checkpoint-b/components-1280.png` (exact command): every component class × state renders; grep — `tokens.css` has `:root` only, **every ADR-26 role + `--icon-*`/`--container-*` defined**, `app.css` declares no custom properties anywhere; **S6 motion/fallbacks/responsive reconciled with ADR-26 and S1 preserved**; `node scripts/a11y-checks.js` contrast subset green; reduced-motion opacity-only branch present. Reviewer: agent; human design-taste rides HC-B on the captured screenshots.
- No-regression: ADR-7 contrast, ADR-19 token discipline, ADR-26 values from direction.md only. Skills: [`frontend-design`, `accessibility`].

### M-G04 gamify-cards (gamify/04, ADR-24/26)
- Objective: `src/ui/gamify-cards.js` via `h()`: `xpCard`, `streakCard`, `challengeCard`, `achievementGrid` (**renders `glyph`**), `unlockMoment` (ADR §13 signatures); tokens only; G1 app.css section; a11y by construction (badge names, progressbar values, calendar text labels, `role="status"` no focus steal); stamp-press motion with reduced-motion branch.
- Inputs: `issues/04-gamify-cards.md`, ADR-24 (rarity/display), ADR-26, ADR §13.
- Outputs: `src/ui/gamify-cards.js`, `styles/app.css` (G1 section), `test/harness/gamify.html`, `.autoforge/validation/checkpoint-b/gamify-{390,1280}.png`.
- touches: [`src/ui/gamify-cards.js`, `styles/app.css`, `test/harness/gamify.html`]
- blocked_by: [M-P01B, M-G01, M-G02, M-G03, M-P04] (tokens + engine output shapes)
- Acceptance: `node scripts/harness-run.mjs test/harness/gamify.html --assert --shot .autoforge/validation/checkpoint-b/gamify-390.png --shot .autoforge/validation/checkpoint-b/gamify-1280.png` (exact command): structural asserts (aria names, progressbar values, calendar day labels, rarity, glyph, unlock-moment once + dismissible + no focus theft, reduced-motion branch); `node --check`; no import from `src/app.js`/`src/ui/dashboard.js`; contrast pairs ≥4.5:1; copy grep (ADR-18 + ADR-24 guilt/fake-social bans) clean. Reviewer: agent.
- No-regression: ADR-7, ADR-18/24 copy rules. Skills: [`accessibility`, `tdd`].

### M-G05 gamify-viz (gamify/05, ADR-25)
- Objective: `src/ui/gamify-viz.js`: `wpmChart({sessions,maxPoints=120})` hand-rolled SVG (ink polyline + quieter comprehension line; deterministic day/week bucketing when >120 points; per-point `<title>` + accessible summary; no NaN at 0/1 sessions), `bestPodium` (top-3 WPM, ties earliest, local only), `recordsList` (**all 10 record ids**); G2 app.css section; reduced-motion static branch.
- Inputs: `issues/05-gamify-viz.md`, ADR-25 chart/downsampling decision, ADR §13.
- Outputs: `src/ui/gamify-viz.js`, `styles/app.css` (G2 section), `test/harness/gamify.html`, `.autoforge/validation/checkpoint-b/gamify-{390,1280}.png` (shared page; G04 writes, G05 re-shoots after its append).
- touches: [`src/ui/gamify-viz.js`, `styles/app.css`, `test/harness/gamify.html`]
- blocked_by: [M-G04] (shared app.css + harness; sequential)
- Acceptance: `node scripts/harness-run.mjs test/harness/gamify.html --assert --shot .autoforge/validation/checkpoint-b/gamify-390.png --shot .autoforge/validation/checkpoint-b/gamify-1280.png` (exact command): 1000-session fixture → ≤120 points + deterministic buckets; podium 3 slots from ≥3 sessions; 10 records listed; empty states; reduced-motion static; `node --check`; no new dependency/fetch. Reviewer: agent.
- No-regression: ADR-7 reduced motion, ADR-1 no deps. Skills: [`tdd`].

---

## W3 — domain + persistence (scheduled W1b, disjoint from W2)

See M-P03A and M-P03B above (W1b). Map W3's "then gamify/06 integration" is **superseded by ADR §15's added dependency (product/07)**: G06 lands in W5 after W4.

---

## W4 — surface redesign (app.css + app.js sequential chain)

### M-P05B player-implementation (product/05 execution, ADR-21/26)
- Objective: implement the frozen player prototype: player-view redesign (progressive disclosure, controls pause/resume/restart/skip, speed steps, modes, typography, goal chip + progress against goal, transitions) + `app.js` resume/restore (paused at restored chunk, elapsed seeded from snapshot) + goal plumbing; S3 app.css section.
- Inputs: `design/player-ux.md` + `design/player-prototype.html` (M-P05A, resolved), ADR-21 lifecycle/resumability, ADR-26.
- Outputs: `src/ui/player-view.js`, `src/app.js`, `styles/app.css` (S3 section), walkthrough steps.
- touches: [`src/ui/player-view.js`, `src/app.js`, `styles/app.css`, `.autoforge/validation/e2e-walkthrough.mjs`]
- blocked_by: [M-P05A, M-P01B, M-P02, M-P03A, M-G05, HC-A, HC-B]
- Acceptance: walkthrough (CDP): goal set → play → live indicators vs goal; keyboard map; pause/resume/restart/skip; speed change; chunk size incl. experimental 3; exit → boot → Resume → paused at restored chunk; **resume double-count test (critic M4): pause/resume ≥2 times then complete → `elapsedMs` equals Σ `activeMs` (± rounding) and WPM uses total elapsed; snapshot cleared on record and on quiz-cancel**; focus mode hides chrome; announcements at sentence boundaries only; reduced-motion defaults auto-advance off. No-regression: ADR-5 timing, ADR-7, ADR-8 chunk policy, ADR-18 drill + copy grep; `node --test test/` green. Reviewer: agent. Skills: [`tdd`, `accessibility`].

### M-P06B library-implementation (product/06 execution, ADR-21/26)
- Objective: implement the frozen library prototype: search/filter/sort/favorite (`texts.favorite` delta + `uiPrefs` persistence), per-item metadata (words, est. time, progress, completion, last session, mastery), import surface states (idle→dragging→parsing→success→failure, duplicate detection, recovery, rights copy), empty states, resume banner + interrupted/restored states, delete confirm; `app.js` import states/favorite; URL import http(s)-only + ~10MB cap (binding 10); S2 app.css section.
- Inputs: `design/library-ux.md` + prototype (M-P06A, resolved), ADR-21, §14 `texts.favorite`.
- Outputs: `src/ui/library.js`, `src/app.js`, `styles/app.css` (S2 section), walkthrough steps.
- touches: [`src/ui/library.js`, `src/app.js`, `styles/app.css`, `.autoforge/validation/e2e-walkthrough.mjs`]
- blocked_by: [M-P06A, M-P01B, M-P02, M-P03A, M-P05B, HC-A, HC-B]
- Acceptance: walkthrough: all import paths (txt/md/epub/docx/pdf, paste, URL+fallback, JSON) work; **`totalWords` fallback for legacy texts preserved (critic minor 10)**; duplicate detection; failure/unsupported banners; search/filter/sort/favorite persist; resume banner → resume; empty states; delete confirm; URL cap + non-http(s) rejection; no `innerHTML` (grep zero). No-regression: ADR-11 chapter picker, ADR-10 posture, §23 security; `node --test test/` green. Reviewer: agent. Skills: [`tdd`, `accessibility`].
- Contingency: if the session overruns, split import-surface work from list/search/favorite work (cited; both halves keep this ticket).

### M-P07A quiz-review (product/07 part 1, ADR-25 + ADR-12)
- Objective: quiz review state (`answering → submitted → review → completed`; per-question correct/incorrect/skipped + score + "Edit expected answers") with the ADR-12 answering/authoring split preserved (authoring never amends a completed session — **I3 app-path test owner**); quiz copy inventory; S4 app.css section.
- Inputs: `issues/07-feedback-loop.md`, ADR-25 quiz state machine, ADR-12.
- Outputs: `src/ui/quiz-view.js`, `styles/app.css` (S4 section), walkthrough steps, quiz copy inventory (in module report).
- touches: [`src/ui/quiz-view.js`, `styles/app.css`, `.autoforge/validation/e2e-walkthrough.mjs`]
- blocked_by: [M-P01B, M-P06B, HC-B]
- Acceptance: walkthrough: submit → review (correct/incorrect/skipped + score) → authoring edits persist `edited:true` **without amending the completed session (I3 app-path test: answering save amends at most once; authoring save never amends)**; copy inventory present; `node --test test/quiz.test.js test/quiz-regression.test.js` + answering-exclusion grep green. No-regression: ADR-12 split, ADR-4 trend copy. Reviewer: agent. Skills: [`tdd`, `accessibility`].

### M-P07B dashboard-summary (product/07 part 2, ADR-25)
- Objective: dashboard `render({sessions, suggestion, gamify, summary})` full ADR-25 card set/hierarchy + low-data states + downsampling ≤120; summary state (10-item order, focus to heading, one consolidated announcement); reward-moment sequencing (priority + reduced-motion, dismissible, no focus theft); `app.js` summary wiring; S5 app.css section; copy inventory; `scripts/dashboard-perf.mjs` introduced here (1000-session budget), final owner M-P08A.
- Inputs: `issues/07-feedback-loop.md`, ADR-25, ADR §13 dashboard contract, ADR-24 priority order.
- Outputs: `src/ui/dashboard.js`, `src/app.js` (summary wiring), `styles/app.css` (S5 section), `scripts/dashboard-perf.mjs`, walkthrough steps, summary/dashboard copy inventory (in module report).
- touches: [`src/ui/dashboard.js`, `src/app.js`, `styles/app.css`, `scripts/dashboard-perf.mjs`, `.autoforge/validation/e2e-walkthrough.mjs`]
- blocked_by: [M-P07A, M-P03B, M-P06B, HC-B]
- Acceptance: walkthrough: summary renders all 10 ADR-25 sections in order + focus to heading + announcement once; dashboard hierarchy + recent-50 table + aggregate toggle; low-data states (0 / 1–3 sessions); reward order + reduced motion; `node scripts/dashboard-perf.mjs` (exact command) → 1000-session render <100ms; `node --test test/` green. No-regression: ADR-11 grouping key `textId`, ADR-4 trend copy, ADR-7, ADR-12 untouched. Reviewer: agent. Skills: [`tdd`, `accessibility`].

---

## W5 — integration, gates, validation

### M-G06 integration (gamify/06, ADR-22/24/25)
- Objective: wire it all: `app.js` engine composition (profile load, moments, xp/level/streak/achievements/challenges/records → `gamify`), header HUD (XP + streak, hidden in player focus mode), dashboard consumes `gamify` + `summary` (**contract frozen by M-P07B; no dashboard.js edit — dropped from touches per critic minor 9**), seen-marking via `profile.markSeen` (**supersedes `settings.seenAchievements`**, binding 5), reward-once behavior.
- Inputs: `issues/06-integration.md`, ADR-22/24/25, ADR §13 dashboard contract.
- Outputs: `src/app.js`, `index.html` (header HUD), walkthrough steps.
- touches: [`src/app.js`, `index.html`, `.autoforge/validation/e2e-walkthrough.mjs`]
- blocked_by: [M-P07B, M-G04, M-G05, M-P03A, M-P03B]
- Acceptance: walkthrough: after real session + quiz → XP>0, level, streak day marked, unlock moment appears once, second dashboard visit does not repeat; HUD visible across views (hidden in player); v1 export import renders without error; copy grep (speed + guilt + fake-social) clean; zero network after load; `node --test test/` green. Reviewer: agent. Skills: [`tdd`].

### M-G07 gamify-gate (gamify/07, ADR-27)
- Objective: cross-cutting gamification verification gate — extend `scripts/a11y-checks.js` (keyboard, badge/progressbar/calendar attributes, unlock `role=status`, contrast pairs) and the walkthrough (reduced motion, copy bans, zero network, **zero critical console errors**). No feature work.
- Inputs: `issues/07-gamify-gate.md`, ADR-27.
- Outputs: extended `scripts/a11y-checks.js`, extended `.autoforge/validation/e2e-walkthrough.mjs`.
- touches: [`scripts/a11y-checks.js`, `.autoforge/validation/e2e-walkthrough.mjs`]
- blocked_by: [M-G06]
- Acceptance: extended harness passes headless Chromium (documented command); walkthrough green end-to-end; **console-error assertion: zero uncaught exceptions / `console.error` during the gamification paths (mission §31; critic minor 4)**; `node --test test/` green; findings recorded — any miss fixed or escalated with evidence (no silent pass). Reviewer: agent. Skills: [`accessibility`, `verify-and-stop`].

### M-P08A harness-build (product/08 part 1, ADR-27)
- Objective: build the verification harness inventory: extend `scripts/{a11y-checks,export-import,idb-failure,perf-large-book}.js`; own final state of `scripts/harness-run.mjs`; extend `scripts/dashboard-perf.mjs` (1000-session fixture, render <100ms; filename `.mjs` is authoritative — ADR-27's `.js` reference superseded, critic minor 7); add `scripts/security-checks.mjs` (zero `innerHTML|outerHTML|insertAdjacentHTML`; URL http(s)+10MB; JSON shape probes), `scripts/screenshots.mjs` (6 surfaces × 390/1280 → `.autoforge/validation/screenshots/`); `docs/browser-checklist.md` (Safari/Firefox, touch, zoom/reflow, SR listening). Owns final harness state; no feature work.
- Inputs: `issues/08-verification.md`, ADR-27 harness inventory + coverage map.
- Outputs: listed scripts + `docs/browser-checklist.md` + `test/harness/*` final state.
- touches: [`scripts/a11y-checks.js`, `scripts/export-import.js`, `scripts/idb-failure.js`, `scripts/perf-large-book.js`, `scripts/harness-run.mjs`, `scripts/dashboard-perf.mjs`, `scripts/security-checks.mjs`, `scripts/screenshots.mjs`, `docs/browser-checklist.md`, `test/harness/*`]
- blocked_by: [M-G07] (harness serialization; surfaces complete transitively)
- Acceptance: every script runs with a documented command and exits 0; `node --test test/` discovery unaffected (runners stay in `scripts/`, no top-level-await in `test/`); screenshots written; security greps zero findings; dashboard budget recorded; console-error capture included in the walkthrough. Reviewer: agent. Skills: [`verify-and-stop`].

### M-P08B validation-run (product/08 part 2, ADR-27 + mission §30–31) — human_gate (HC-C)
- Objective: run the full evidence set and write the honest report: `node --test test/`, walkthrough (all 21 states, resume, reward-once, refresh/close-reopen, v1+v2 import, **numeric resume double-count assertion**, console errors), all harness scripts, perf + security + screenshots; write `.autoforge/validation/report-003.md` (coverage map §→evidence, honest limits: headless Chromium only, no pixel-diff, no SR-quality automation, `node --test` does not exercise IDB, **v2 store irreversibility + export-before-update guidance (critic M5)**). Zero feature work; failures recorded and returned to the owning module. **No push/deploy.**
- Inputs: all module outputs, ADR-27.
- Outputs: `.autoforge/validation/report-003.md`, `README.md` (v2 irreversibility / export-before-update note), refreshed `.autoforge/validation/*.json`.
- touches: [`.autoforge/validation/report-003.md`, `README.md`, `.autoforge/validation/e2e-walkthrough.mjs`, `.autoforge/validation/*.json`]
- blocked_by: [M-P08A]
- Acceptance: `node --test test/` green; `node .autoforge/validation/e2e-walkthrough.mjs` green (21 states, resume double-count numeric assertion, reward-once, v1+v2 import, zero critical console errors); all scripts exit 0; report-003.md written with command outputs + honest limits + v2 irreversibility note; **HC-C human review recorded in report-003.md**; no push. Reviewer: agent + human (HC-C screenshots/browser checklist). Skills: [`verify-and-stop`].

---

## DAG / parallel schedule

- **G1 (parallel, pairwise disjoint):** M-P01A (design/) ∥ M-P02 (index/app.js/app.css-S1) ∥ M-G01 ∥ M-G02 ∥ M-G03 ∥ M-P04 (pure libs). 6 workers.
- **G2 (parallel, disjoint):** M-P03A (←M-P02; store/profile/app.js/harness-run) ∥ M-P03B (←G01,G02,G03,P04; events.js) ∥ M-P05A (←M-P01A; design/) ∥ M-P06A (←M-P01A; design/). 4 workers.
- **HC-A (human checkpoint, batched):** after M-P01A + M-P05A + M-P06A artifacts → **one** human reaction, resolutions recorded in tickets 01/05/06. Gates M-P01B, M-P05B, M-P06B. **Rework path (critic M6):** CHANGES → orchestrator opens amendment modules `M-P01A-r1` / `M-P05A-r1` / `M-P06A-r1` as needed; gated modules stay blocked until re-approval (a second HC-A). Prototypes are direction-swappable (single small CSS block) to keep rework cheap.
- **G3 (app.css chain):** M-P01B (←M-P02, HC-A). Runs concurrently with any remaining G2 tail (files disjoint).
- **G4:** M-G04 (←M-P01B, G01–G03, P04). **G5:** M-G05 (←M-G04). (app.css G1/G2 sections; strictly sequential.)
- **HC-B (human checkpoint; critic M1):** after M-P01B + M-G04 + M-G05 + M-P03A + M-P03B. **Artifacts:** `test/harness/components.html` + `gamify.html` screenshots at 390/1280 (`.autoforge/validation/checkpoint-b/*.png`, captured by M-P01B/G04/G05 via `scripts/harness-run.mjs --shot`), P03A/P03B harness outputs, `.autoforge/validation/checkpoint-b.md` (per-item yes/no + threshold: role/state coverage, contrast ≥4.5:1, reduced-motion branch, IA state table, economy constants/catalog, persistence invariants). Binding-8 screenshots do not exist until M-P08A; HC-B reviews harness pages/prototype artifacts instead. Gates M-P05B, M-P06B, M-P07A, M-P07B. CHANGES → orchestrator-opened amendment modules.
- **G6 (strictly sequential app.css + app.js chain):** M-P05B (←M-P03A, M-P01B, M-G05, HC-A/HC-B) → M-P06B (←M-P06A, M-P03A, M-P01B, M-P05B, HC-B) → M-P07A (←M-P01B, M-P06B, HC-B) → M-P07B (←M-P07A, M-P03B, M-P06B, HC-B).
- **G7:** M-G06 (←M-P07B, M-G04, M-G05, M-P03A, M-P03B). **G8:** M-G07 (←M-G06). **G9:** M-P08A (←M-G07). **G10:** M-P08B (←M-P08A).
- **Critical path (critic minor 1, recomputed):** M-P01A → M-P05A → HC-A → M-P01B → M-G04 → M-G05 → HC-B → M-P05B → M-P06B → M-P07A → M-P07B → M-G06 → M-G07 → M-P08A → M-P08B.
  Runner-up branch: M-P02 → M-P03A → HC-B (HC-B also waits on M-P03B ← economy libs); M-P06A joins HC-A in parallel with M-P05A.
- **Interface freezes:** all ADR §13 signatures verbatim; `exportAll` shape superseded by ADR-23 only; data deltas additive only (§14); no module outside tickets + ADRs.

## Coverage check

**Tickets (15/15, exactly once; splits cited):**
product/01 → M-P01A + M-P01B (split: ticket 01 out-of-scope line "implementing the full system = the execution wave after this ticket closes" + ADR-26 §slot-in "W2 fills values only");
product/02 → M-P02; product/03 → M-P03A + M-P03B (split: dependency timing — `events.js` statically imports the five economy libs; store/profile/app.js do not; ADR §13 keeps events a separate freeze; file budget);
product/04 → M-P04; product/05 → M-P05A + M-P05B (split: ticket deliverable is "prototype page + interaction spec"; ADR §15 assigns the implementation files to product/05);
product/06 → M-P06A + M-P06B (same split reason as 05); product/07 → M-P07A + M-P07B (**split added in v1.1 per critic M3: 3 surfaces + 2 CSS sections + app.js wiring exceeded one worker session**);
product/08 → M-P08A + M-P08B (split: harness construction vs validation evidence — ADR-27 lists distinct harness groups; run-002 S7 verification-only precedent);
gamify/01 → M-G01; gamify/02 → M-G02; gamify/03 → M-G03; gamify/04 → M-G04; gamify/05 → M-G05; gamify/06 → M-G06; gamify/07 → M-G07.
**Result: 15/15 owned, 0 unowned, 0 duplicated.** Merges considered and rejected: product/02+07 (ownership differs: index/app.js/app.css-S1 vs quiz-view/dashboard/app.css-S4/S5 — keep 1:1); product/04+gamify/01–03 (ADR-24 authority vs execution, ADR §15 keeps 1:1).

**21-state → owner table (critic minor 12; each row asserted by P08B's walkthrough before validation):**

| State | Owner module(s) |
|---|---|
| first-use / empty library / populated library | M-P06B (M-P02 shell) |
| importing / parsing / failed import / unsupported content | M-P06B (P03A error contract) |
| ready / active / paused | M-P05B |
| completed (session) | M-P05B → M-P07B transition |
| quiz (answering) / quiz completed | M-P07A |
| achievement unlocked / level-up / streak update | M-G06 + M-G04 |
| returning user | M-P06B (banner) + M-P07B (dashboard recent) |
| no recent activity | M-P07B (low-data state) |
| corrupted data | M-P02 (shell banner) + M-P03A (recovery contract) |
| interrupted session | M-P03A (snapshot) + M-P06B (banner) |
| restored session | M-P05B |

**Invariant ownership (ADR-23 I1–I10):** I1/I2/I7 → M-P03B (`invariants.test.js`); I3 → M-P07A (app-path test; grep rule); I4 → M-G02; I5 → M-P03A (`markSeen` idempotency) + M-G03; I6/I10 → M-P03A harness; I8 → M-G03 + M-P04; I9 → existing `test/quiz.test.js`.

**Mission §1–§32 → module(s) / deferral:**
§1 audit → discovery report (done); §2–3 IA/journey → M-P02 + W4 surfaces; §4 design system → M-P01A/M-P01B (**incl. icon sizes + container widths, critic minor 2**); §5 responsive → M-P02, M-P01B (S6), W4 modules, M-P08B; §6 library → M-P06A/B; §7 player → M-P05A/B; §8 quiz → M-P07A; §9–11 gamification → M-P04, M-G01–G03, M-G06; §10 Trophy → M-P01A mapping table + M-G04; §12 animation → M-P01B (S6 + primitives) + M-G04/G05 + W4 surfaces + M-G07; §13 persistence → M-P03A; §14 events → M-P03B; §15 dashboard → M-P07B; §16 achievements → M-G03 (**incl. `glyph` icon field, critic minor 3**) + M-G04; §17 challenges → M-P04 + M-G04; §18 records → M-P04 (10 ids) + M-G05; §19 summary → M-P07B; §20 a11y → per-module subsets + M-G07 + M-P08A/B; §21 browsers → M-P08A (`docs/browser-checklist.md`) + M-P08B (honest limits); §22 perf → M-P07B (`dashboard-perf.mjs`) + M-P08A/B; §23 security → M-P06B (URL cap) + M-P08A (greps/shape probes); §24 import/export → M-P03A + M-P08A; §25 UX states → M-P01B + W4 modules; §26 grill design → grilling + ADR-21..27 (done); §27 implementation strategy → wave schedule + per-module verify loop; §28 testing → all modules + M-P08A/B; §29 invariants → table above; §30–31 validation/exit → M-P08B + HC-C (**incl. console-error check, critic minor 4**); §32 deliverable → M-P08B report.
**Deferrals (explicit):** multi-user/cloud/auth/leaderboards (map §Out of scope; seam only); pixel-diff regression (binding 8 — screenshots + human review until a regression bites); automated cross-browser (binding 7 — manual checklist); human SR pass (ADR-16, tracked separately, not this run's gate); notifications/reminders (gamify spec); badge art (text `glyph` delivered instead); CI service (product/08 out-of-scope); push/deploy (no push unless human asks).
**Nothing outside tickets + ADRs.**

## Critic disposition (plan-003)

- B1 → fixed: `M-G05` added to M-P05B; `M-P05B` added to M-P06B; HC-A/HC-B mirrored into `blocked_by` as pseudo-nodes; scheduler contract stated.
- B2 → fixed: app.css section→owner table published; S6 assigned to M-P01B with ADR-26 reconciliation + S1 preservation in acceptance.
- M1 → fixed: HC-B artifacts/criteria enumerated; note that binding-8 screenshots do not exist until P08A, so HC-B reviews harness-page captures produced by P01B/G04/G05.
- M2 → fixed: `scripts/harness-run.mjs` added (introduced by P03A, final owner P08A); exact commands in P03A/P01B/G04/G05 acceptances.
- M3 → fixed: M-P07 split into M-P07A/M-P07B with cited reason; overrun contingencies added to P03A/P06B.
- M4 → fixed: resume double-count numeric assertion in M-P05B + P08B walkthrough.
- M5 → fixed: upgrade-abort case in M-P03A harness; v2 irreversibility documented in P08B report + README note.
- M6 → fixed: HC-A CHANGES rework protocol (amendment modules + re-approval) added.
- Minors 1–17 → fixed in place (critical path recompute, §4 icon/container, §16 glyph, §31 console errors, G01 streak/bonus cases, I3→P07A / I5→P03A ownership, dashboard-perf `.mjs` filename, P08B `human_gate: true`, G06 dashboard.js touch dropped, totalWords fallback, 10 record ids, 21-state table, custom-property rule sentence, P02 ADR-10, P02 corruption mechanism, §-notation qualifier, ticket-07 copy inventory). No minors rejected.

## Open questions for the critic (weakest assumptions, v1.1)

1. **Serialized critical path + 3 human checkpoints.** The app.css chain plus HC-A/HC-B means the schedule is human-latency-bound (residual doubt 2). No rework budget is planned beyond the M6 protocol; is an explicit rework-slot budget needed?
2. **HC-A batching risk remains.** P05A/P06A are built in Candidate A before the human reacts to P01A; direction-swappability mitigates but does not remove the rework cost.
3. **P03B gates the tail.** `events.js` statically imports all five economy libs; any engine signature shift mid-flight blocks M-P07B → M-G06 → gates. No module absorbs a mid-flight signature change.
4. **Resume ownership still spans P02/P03A/P06B/P05B** even with the M4 numeric test; the state is implemented across four modules.
5. **Split realism.** P03A/P06B/P07A/P07B contingencies exist; if mid-run splits happen, coverage re-citation and walkthrough ordering may drift (residual doubt 3).
