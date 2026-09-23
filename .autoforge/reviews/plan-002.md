# Plan Review — run speedreading-002 (adversarial, pre-execution)

- Reviewer: autoforge-reviewer (plan critic, independent of planner)
- Date: 2026-09-23
- Inputs read: `.autoforge/plans/plan.md`, `.autoforge/execution/work-order.json`, `.autoforge/architecture/decisions.md` §7–§11, `.autoforge/requirements/grilling.md`, `.autoforge/discovery/tracker-index.md`, plus repo reality (`src/ui/`, `src/lib/`, `test/`, `styles/`, `index.html`, `docs/`, `scripts/`, `design/`, `.scratch/**/issues/*.md`)
- Method: checked every `touches`/`outputs` path against `glob`, every `blocked_by` edge against `tracker-index.md`, every `node --test` acceptance against ADR-6 and import-time DOM use. No code modified.

## Verdict: CHANGES_REQUIRED

Coverage (19/19, F06 split per ADR-16) and interface-freeze copies (§8) are correct. The plan cannot execute as-is: five touched view paths do not exist under the names given, two frozen-spec inputs do not exist, DOM acceptances contradict ADR-6 test policy, one parallel group shares a doc file, and the S-chain is missing consumer edges on shared views. All fixes are plan-artifact edits (rename, re-edge, re-acceptance); no architecture rework needed except either deleting phantom views or authorizing them.

## Findings (ranked)

### F1 — HIGH — Invented filenames for existing modules: `library-view.js` / `dashboard-view.js`
Evidence:
- `src/ui/library.js:1`: `export function createLibraryView(...)` — real file is `library.js`, no `library-view.js` exists (`ls src/ui/` → `a11y.js, dashboard.js, library.js, player-view.js, quiz-view.js`).
- `src/ui/dashboard.js:1`: `export function createDashboard(...)` — real file is `dashboard.js`, no `dashboard-view.js` exists.
- `.autoforge/plans/plan.md:15` (`M-F01 touches src/ui/library-view.js`), `plan.md:141` (`M-RS2 touches src/ui/library-view.js`), `plan.md:168` (`M-RS5 touches src/ui/dashboard-view.js`); same names in `work-order.json` `M-F01/M-RS2/M-RS5.touches`.
Impact: workers edit nonexistent paths; F01 and RS2 diverge instead of serializing on the real file.
Required change: in `plan.md` and `work-order.json`, rename every `src/ui/library-view.js` → `src/ui/library.js` and every `src/ui/dashboard-view.js` → `src/ui/dashboard.js` (M-F01, M-RS2, M-RS5 `touches` + `outputs`).

### F2 — HIGH — Phantom new views `header-view.js` / `app-shell.js` / `setup-view.js` contradict tickets and ADR-19 rejections
Evidence:
- `ls src/ui/` has no `header-view.js`, `app-shell.js`, or `setup-view.js`.
- `.scratch/speedreading-redesign-build/issues/S1-header-nav-material.md:31`: `Out of scope: changing routes, views, or copy.`
- `.scratch/speedreading-redesign-build/issues/S3-page-rail-setup.md:5-6`: setup block replaces settings row *inside the player view*; no new view authorized. `S2` brief (`S2-shelf-restyle.md:25-29`) says migrate *the library view* to `h()`, not create one.
- `.autoforge/architecture/decisions.md:130`: `Rejected (upheld): player-view split, settings module, router module.` — `app-shell.js` is a router module, `setup-view.js` is a settings-module split by another name.
- `.autoforge/plans/plan.md:132` (`src/ui/*.js (header/nav adapter via h())`), `plan.md:149-150` (`player-view.js, setup-view.js`), work-order `M-RS1/M-RS3.outputs` pin the phantom names.
Impact: S-chain invents architecture the tickets and ADR explicitly rejected; scope unbounded (`src/ui/*.js` glob) for one worker session.
Required change: pick one — (a, recommended) delete the three phantom files from `touches`/`outputs`; M-RS1 restyles in place (`index.html:11-20` header/nav + `styles/app.css` S1 section, zero new modules), M-RS3 keeps setup block inside `src/ui/player-view.js`; or (b) file an ADR amendment explicitly authorizing each new module with its import contract and update S1/S3 `Out of scope` lines to match. Do not ship a glob output (`src/ui/*.js` → list exact files).

### F3 — HIGH — Frozen-spec inputs do not exist: `design/tokens.md`, `design/pass-3-*.md`, `design/architecture.md`
Evidence:
- `glob design/**/*` → no files found.
- `.autoforge/plans/plan.md:121` (`Inputs: issues/B3..., design/tokens.md`), `plan.md:129` (`design/tokens.md + design/architecture.md + design/pass-3-*.md`), `plan.md:139-173` (each RS ticket inputs `pass-3`).
- `.scratch/speedreading-redesign-build/issues/B3-tokens-css-split.md:29`: `Key interfaces: the custom-property names (frozen in design/tokens.md)`.
Impact: M-RB3 and the entire S-chain (M-RS1–RS6) cannot verify "matches spec" — acceptance unexecutable.
Required change: commit the missing specs under `design/` before execution, or repoint `inputs` to the actual authority and freeze values inline in `decisions.md` §8 (e.g. paste the `:root` table). Every RS module acceptance must name the spec file revision it builds against.

### F4 — HIGH — DOM acceptances as `node --test` contradict ADR-6; `h()` → `Element` cannot run in plain node
Evidence:
- `.autoforge/architecture/decisions.md:40-42` (ADR-6): `store.js, ui/*, and app.js are exercised by a scripted browser acceptance walkthrough` — only `src/lib/*.js` (except `store.js`) get `test/*.test.js` runnable with `node --test`.
- `src/app.js:28-33`: `document.querySelector('#view-library')` at module top level — importing `app.js` in node throws.
- `.autoforge/architecture/decisions.md:149`: `h(...) -> Element` (real DOM node); `.scratch/speedreading-redesign-build/issues/B2-dom-helper-h.md:28` simultaneously demands `tests assert nesting, attributes, and listener attachment without a browser`.
- `.autoforge/plans/plan.md:17` (`node --test test/chapter.test.js` for app.js chapter attribution), `plan.md:26` (`quiz-authoring.test.js` for `quiz-view.js` DOM exclusion), `plan.md:99` (`span-drill.test.js` for `player-view.js` drill), `plan.md:116` (`node --test test/h.test.js`).
Impact: four acceptances fail on a clean checkout (no jsdom — banned by ADR-1 no-deps); workers will either burn budget inventing a DOM shim (scope creep) or fake green by testing logic that never touches the view.
Required change: change M-F01/M-F02/M-F10/M-RB2 acceptance to harness/walkthrough asserts for the DOM half and keep `node --test` only for a pure seam (e.g. chapter attribution helper extracted to `src/lib/`, answering-exclusion checked by static grep over `src/ui/quiz-view.js` — already present — plus harness render check, `h()` tested against a checked-in minimal stub explicitly authorized as an exception to ADR-1, or return a string/virtual node instead of `Element` with §8 freeze updated accordingly).

### F5 — HIGH — G0 parallel collision on `docs/manual-walkthrough.md` (M-F05 × M-F06A)
Evidence:
- `.autoforge/plans/plan.md:51` (M-F05 touches `docs/manual-walkthrough.md`), `plan.md:60` (M-F06A touches `docs/manual-walkthrough.md`), `plan.md:193` (G0 lists both as parallel; `docs/` currently contains only `docs/agents/`, so both workers create/extend the same new file).
- `.autoforge/execution/work-order.json`: `parallel_groups[0].members` includes `M-F05` and `M-F06A` with `touches` overlapping on `docs/manual-walkthrough.md`; M-F06A `outputs` omits the doc while `touches` includes it (outputs/touches mismatch).
Impact: parallel workers overwrite each other's walkthrough sections; "append-only halves" guard (`plan.md:193`) is unenforceable without a merge owner.
Required change: make G0 disjoint — single-owner the doc (e.g. M-F05 owns `docs/manual-walkthrough.md`, M-F06A writes `test/harness/a11y-checks.js` only and appends via `blocked_by: [M-F05]`), or split into `docs/manual-walkthrough-export.md` / `-a11y.md`. Fix M-F06A `outputs` to match `touches`.

### F6 — MEDIUM-HIGH — Missing consumer edges: S-chain shares views with F-chain but only RS4 is gated
Evidence:
- `.autoforge/plans/plan.md:96` (M-F10 touches `src/ui/player-view.js`), `plan.md:149-151` (M-RS3 touches `src/ui/player-view.js`, `blocked_by: [M-RB1, M-RB2, M-RB3, M-RS2]` — no M-F10).
- `plan.md:15` (M-F01 touches real `library.js`), `plan.md:141` (M-RS2 touches same file, `blocked_by` has no M-F01).
- `plan.md:196` admits it: `RS3 runs in S-chain after F-tickets merge; conflict check at RS3 start` — a note, not an edge.
Impact: S-chain workers starting after G0/G1 but before the `app.js` chain merges silently overwrite F01 chapter control / F10 drill mode (or vice versa).
Required change: add `M-F10` to `M-RS3.blocked_by` and `M-F01` to `M-RS2.blocked_by` (both files), or add an explicit phase gate (`S-chain starts only after F-chain merge`, encoded as `blocked_by`, not prose). Mirror in `work-order.json`.

### F7 — MEDIUM — `test/metrics.test.js` owned by two modules; "sequential" group encoding is ambiguous
Evidence:
- `.autoforge/plans/plan.md:33` (M-F03 touches `test/metrics.test.js`), `plan.md:104-105` (M-RB1 touches `test/metrics.test.js` + `test/text.test.js`); M-RB1 acceptance `plan.md:107` runs both files, M-F03 acceptance `plan.md:35` runs `metrics.test.js` alone (order-dependent suite).
- `.autoforge/execution/work-order.json` `parallel_groups[2].members: [M-RB1, M-F03, M-F01, M-F10]` with `note: sequential ... chain` — a `parallel_groups` entry whose members must not run in parallel.
Impact: executor running the group in parallel gets a lost-update on the shared test file; running sequentially works only if the runner reads the note.
Required change: remove the chain from `parallel_groups` (or mark `sequential: true` with enforced order `M-RB1 → M-F03 → M-F01 → M-F10`), and define the append protocol in both modules (RB1 lands `sessionTicks` section, F03 appends `activeMs` section; never rewrite the other's asserts) — or split files (`test/metrics-ticks.test.js` vs `test/metrics-active.test.js`).

### F8 — MEDIUM — Harness acceptances name a headless-Chromium runner that does not exist in-repo
Evidence:
- `ls test/harness/` → `dashboard.html, library.html, player-view.html, quiz-view.html` only (no `.js` runner, no runner docs); `ls scripts/` → empty; ADR-1/ADR-6 assume a `python3 -m http.server` + manual walkthrough, no headless tooling committed.
- `.autoforge/plans/plan.md:53` (`harness script passes headless-Chromium run`), `plan.md:62,81,89` (same harness-pass phrasing for F06A/F07/F08-browser-timing).
Impact: M-F05/M-F06A/M-F07 have no executable command to turn green; each worker invents its own runner (Playwright/puppeteer = new deps, violating ADR-1) or marks manual steps as pass.
Required change: give each harness module one runnable command using committed files (e.g. `python3 -m http.server` + named manual steps recorded in-ticket, or commit a zero-dependency node/chromium script first as its own module input). Until then change acceptance to `walkthrough steps checked + evidence log`, not `harness passes`.

### F9 — MEDIUM-LOW — M-RS7 gate over-expands tracker edges and `human_gate` disagrees with `reviewer`
Evidence:
- `.autoforge/discovery/tracker-index.md:31`: `RS7 ... blocked-by RS6`; `.scratch/speedreading-redesign-build/issues/S7-green-release.md:7`: `Blocked by: S6 motion-responsive.`
- `.autoforge/plans/plan.md:187`: RS7 `blocked_by` lists all 19 modules; work-order `M-RS7.blocked_by` same (19 edges) including cuttable M-F08 (`cuttable: true, fix_only_on_miss: true`) and human M-F06H.
- Work-order `M-RS7: {reviewer: human, human_gate: false}` vs `plan.md:189`: `Reviewer: human (independent, required)` with acceptance `review APPROVED recorded`.
Impact: release blocks on a cuttable perf ticket and a human-ears pass the S7 ticket never declared; `human_gate: false` lets an agent push to `main` (auto-redeploys Pages per ADR-20) without the independent review the acceptance demands.
Required change: set `M-RS7.human_gate: true` (independent review + live-URL check are human gates), and either justify the 19-edge expansion in `tracker-index.md`/S7 ticket (release waits for F-chain + both human passes) or reduce `blocked_by` to the tracker edge (`M-RS6`) plus named suite/e2e/review gates. State explicitly whether cuttable M-F08 and human M-F06H block the push.

## What checks out (no change)
- Coverage 19/19 exactly once incl. sanctioned F06A+F06H doubling (`plan.md:202-204`, `tracker-index.md:6-31`, F09 correctly excluded per `tracker-index.md:37`).
- §8 freeze copies match modules: `activeMs` (M-F03), `sessionTicks`/`splitSentences` (M-RB1), `h()` (M-RB2), quiz answering/authoring split (M-F02/M-RS4 guard), tokens `:root`-only (M-RB3); data deltas additive-only (`decisions.md:162-170`).
- `M-F01 blocked_by M-F03` / `M-F03 blocked_by M-RB1` / `M-F10 blocked_by M-F01` are legitimate touches-guards on shared `src/app.js` / `src/lib/metrics.js`, correctly disclosed as serialization-only (`plan.md:16,34,97`) despite `tracker-index.md:8` (`all blocked-by none`).
- F05/F07 split (schema-mismatch vs quota/abort) and F08 `fix_only_on_miss` faithfully encode ADR-15/ADR-17.

## Required-change checklist (executor order)
1. Rename `library-view.js`/`dashboard-view.js` → real names (F1).
2. Delete or authorize `header-view.js`/`app-shell.js`/`setup-view.js` (F2).
3. Commit or repoint `design/` spec inputs (F3) — blocks all of S-chain.
4. Re-accept DOM modules to harness/walkthrough + pure seams (F4).
5. De-collide G0 doc ownership (F5); add RS2←F01, RS3←F10 edges (F6); un-parallel the app.js chain group (F7).
6. Define the harness runner command (F8); fix RS7 `human_gate` + edge list (F9).
