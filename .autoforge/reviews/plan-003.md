# Plan critique — run speedreading-003 (plan v1.0 + work-order v2.0, pre-execution)

Reviewer: independent Plan Critic (protocol §Critique). Date: 2026-09-23.
Artifacts under review: `.autoforge/plans/plan.md` (261 lines), `.autoforge/execution/work-order.json` (20 modules).
Authority read: `decisions.md` ADR-21..27 + §13/§14/§15/§16, `grilling.md` binding 1–12, `tracker-index.md`,
`.scratch/speedreading-product/{spec.md,map.md,issues/01..08}`, `.scratch/speedreading-gamify/{map.md,issues/01..07}`,
`discovery/report.md`, plus repo ground truth (`src/`, `test/`, `scripts/`, `styles/`, `.autoforge/validation/`).

**Verdict: CHANGES_REQUIRED**

Verified correct before listing faults (so they are not re-litigated): all 15 frontier tickets are owned exactly once
with cited splits (plan.md:241-248; work-order.json:500-528); no dependency cycle exists; no module does work outside
tickets + ADRs (P08A `docs/browser-checklist.md`/`security-checks.mjs` trace to binding 7/8/10 and ADR-27); mission
§1–§32 each map to a module or an explicit deferral except the gaps below; `node --test`/12 existing test files/CDP
harness counts in ADR-27 match the repo (12 `test/*.test.js`, 4 `scripts/*.js`, `e2e-walkthrough.mjs` present).

---

## Blockers (must fix before execution)

### B1. `blocked_by` does not encode the app.js/app.css/walkthrough single-writer chain
Evidence: plan.md:19 states the app.css chain `P02 → P01B → G04 → G05 → P05B → P06B → P07`; plan.md:17-18 and
work-order.json:17 state the app.js chain `P02→P03A→P05B→P06B→P07→G06`. The machine-readable edges are incomplete:
- `M-P05B.blocked_by` = `["M-P05A","M-P01B","M-P02","M-P03A"]` (work-order.json:265) — missing **M-G05**, its
  app.css predecessor.
- `M-P06B.blocked_by` = `["M-P06A","M-P01B","M-P02","M-P03A"]` (work-order.json:283) — missing **M-P05B** (shared
  `src/app.js`, `styles/app.css`, and `.autoforge/validation/e2e-walkthrough.mjs`).
- Consequence: `M-P07.blocked_by` (work-order.json:301) transitively loses its `M-P05B`/`M-G05` predecessors too.
- HC-A/HC-B gating lives only in `gated_by_checkpoint` strings (work-order.json:266, 284, 302); an executor that
  topologically sorts `blocked_by` alone can start `P05B` before `G05`, or `P06B` before `P05B`, and two workers
  edit the same three shared files concurrently — exactly the collision class this plan's serialization rule exists
  to prevent. The prose DAG (plan.md:233) and singleton `parallel_groups` G6/G7/G8 mitigate only if the executor
  honors groups over edges.

Fix: add `"M-G05"` to `M-P05B.blocked_by`; add `"M-P05B"` to `M-P06B.blocked_by` (P07 then inherits both); mirror
HC-A/HC-B into `blocked_by` or state the scheduler contract explicitly in `executionNotes`; bump `revision`.

### B2. `styles/app.css` section S6 (motion/fallbacks/responsive) has no owner in the run-003 section map
Evidence: ADR-19 §10 assigns six sections, including "S6 motion/responsive" (decisions.md:130); the file exists with
S1–S6 (styles/app.css:17-213). Run-003's chain lists only S1, base/primitives, G1, G2, S3, S2, S4/S5 (plan.md:19;
decisions.md:532). ADR-26 changes the motion system and breakpoint set (decisions.md:360-370), and `M-P01B` is
explicitly a "base and component-primitive rewrite" whose acceptance asserts a reduced-motion branch (plan.md:127-132)
— i.e. it must touch motion rules, but the plan assigns it no section. Result: either P01B silently edits an unowned
shared section (breaking the single-writer discipline the plan relies on) or S6 is left stale against ADR-26 with no
module charged with reconciling it (regression risk on reduced-motion/fallbacks, which are ADR-7 gate items).

Fix: publish the full section→owner table for run-003 (S1 P02, base+primitives+S6-motion/fallbacks/responsive P01B,
G1 G04, G2 G05, S3 P05B, S2 P06B, S4/S5 P07) in plan §Execution rules and decisions §15; add S6 to P01B's `touches`
and acceptance ("S6 motion/fallbacks/responsive reconciled with ADR-26; S1 preserved").

---

## Majors

### M1. HC-B is not a real gate: no artifacts, no criteria, and binding 8's "per gate" screenshots do not exist at gate time
Evidence: work-order.json:468-475 defines HC-B as labels ("design-system primitives taste", "IA confirmation", …) with
no artifact list and no pass/fail test; it gates the three largest modules (P05B/P06B/P07, work-order.json:471).
Binding 8 says screenshots are "captured per gate into `.autoforge/validation/screenshots/`, reviewed by the human at
checkpoints" (grilling.md:34; ADR-27 decisions.md:409), but `scripts/screenshots.mjs` is built in M-P08A
(plan.md:208), i.e. after HC-B and after every surface it would show. At HC-B the human can only open raw harness
pages; there is no reviewable artifact set, no explicit question per item, and no CHANGES protocol (HC-B's
amendment-module note at work-order.json:474 is the only such protocol in the plan).
Fix: enumerate HC-B artifacts with paths (components.html + gamify.html screenshots at 390/1280, `checkpoint-b.md`,
P03A/P03B harness outputs) and a yes/no question + threshold per item; add screenshot capture of P01B/G04/G05 harness
pages to those modules' acceptance (or a small pre-HC-B capture step) so the gate reviews evidence, not intentions.

### M2. Four acceptances require "headless Chromium" runs of `test/harness/*.html` with no runnable command or runner
Evidence: M-P03A "harness page run in headless Chromium (CDP pattern of `scripts/*`; exact command in module report)"
(plan.md:94), M-P01B "components.html renders … in headless Chromium" (plan.md:132), M-G04 (plan.md:141), M-G05
(plan.md:150). The repo has no generic harness runner: `scripts/` holds four app-level CDP scripts
(`a11y-checks.js`, `export-import.js`, `idb-failure.js`, `perf-large-book.js`), and ADR-27's inventory
(decisions.md:377-382) adds none. Run-002's reviews show harness pages were driven by ad-hoc `$TMP` CDP probes
(e.g. `.autoforge/reviews/M-F02.md:31`), which is why harness defects (no-op emitters, wrong mount root) survived
into review rounds. The plan's own verify loop (plan.md:11-13) depends on "the module's targeted harness command",
which for these four modules does not exist.
Fix: add one zero-dep runner to the harness inventory (e.g. `scripts/harness-run.mjs <page> [--assert]`, final
ownership P08A, introduced no later than the first harness-producing module) and cite the exact command in each of
the four acceptances; or explicitly require a committed probe script per harness module. "Exact command in module
report" is not an acceptance criterion.

### M3. M-P07 is too large for one worker session and violates the plan's own module budget
Evidence: M-P07 owns `src/ui/quiz-view.js` (review state + preserved authoring split), `src/ui/dashboard.js` (full
ADR-25 card set/hierarchy, low-data states, ≤120 downsampling), the summary state (10 sections, focus, announcement),
reward-moment sequencing, `src/app.js` wiring, app.css S4 **and** S5, and walkthrough steps (plan.md:180-185;
work-order.json:293-308). `executionNotes` claims "Every module <= ~3 source files + tests/harness; one worker
session each" (work-order.json:544). Three surfaces + sequencing + two CSS sections is the highest concentration in
the run and sits on the critical path.
Fix: split into `M-P07A` (quiz review + authoring split, `quiz-view.js`, app.css S4) and `M-P07B` (dashboard +
summary + reward sequencing, `dashboard.js`, app.css S5, `app.js`), `P07B ← P07A`; update coverage (product/07 still
owned once, split cited), walkthrough order, critical path, and HC-B gate list. `M-P06B` and `M-P03A` are borderline
by the same budget rule — add a "split at X if the session overruns" contingency to each rather than pre-splitting.

### M4. Resume-session correctness (architect top-3 risk) has no numeric test in any acceptance
Evidence: ADR-21 names "snapshot/restore double-counting — owned by `app.js`, tested (ADR-27)" (decisions.md:232);
ADR-27's §13 evidence is only "idb-failure.js + e2e refresh/close-reopen/resume" (decisions.md:408). P03A acceptance
asserts only that pagehide writes `profile.activeSession` and record clears it (plan.md:94); P05B asserts "Resume →
paused at restored chunk" (plan.md:169) — position, not elapsed accumulation. Nothing asserts that
`elapsedMs(snapshot) + activeMs(after resume)` equals the uninterrupted equivalent, or that repeated pause/resume
cycles do not double-count.
Fix: add to M-P05B acceptance: pause/resume ≥2 times, complete → `elapsedMs` equals Σ activeMs (± rounding) and WPM
uses total elapsed; snapshot cleared on record and on quiz-cancel; add the same numeric assertion to the P08B
walkthrough.

### M5. Store v2 has no rollback/irreversibility story and the `onupgradeneeded` abort path is untested
Evidence: ADR-23 asserts atomic upgrade and "if the upgrade aborts, v1 data is intact and `openStore()` rejects"
(decisions.md:259), but P03A's harness acceptance covers fresh v2, v1 fixture upgrade, v1 import wrap, v3 rejection,
invalid-record, dedupe, corrupt profile, quota/abort data-intact, I6/I10 (plan.md:94) — the listed abort case reads
as import abort, not upgrade abort. Nothing states that (a) a v2 DB cannot be downgraded, (b) a v2 export cannot be
read by pre-003 builds, or (c) a pre-upgrade export/backup exists.
Fix: P03A harness adds an upgrade-failure case (simulate `onupgradeneeded` failure; assert openStore rejects and a v1
reader still sees the fixture), or the claim is demoted to an honest-limits line; P08B `report-003.md` documents v2
irreversibility and export-before-update guidance (README note).

### M6. HC-A CHANGES has no rework protocol
Evidence: the only consequence recorded is "rejection of Candidate A invalidates P05A/P06A prototypes (flagged risk
#4)" (work-order.json:465); HC-B by contrast defines "CHANGES become orchestrator-opened amendment modules"
(work-order.json:474). No module, budget, or path exists for a CHANGES verdict on the batched prototypes.
Fix: mirror HC-B's note on HC-A: "CHANGES → orchestrator opens amendment modules (`M-P01A-r1`, `M-P05A-r1`,
`M-P06A-r1` as needed); P01B/P05B/P06B remain blocked until re-approval"; record per-ticket CHANGES lists in tickets
01/05/06 (already planned) and treat re-approval as a second HC-A.

---

## Minors

1. **Critical path is incomplete** (plan.md:235; work-order.json:486-499): it omits HC-B and the P05A/P06A join into
   HC-A (HC-A requires both prototypes, so they are effectively on the critical path). Fix: recompute and include
   HC-B; note the runner-up branch through P03B (HC-B waits on P03A/P03B too).
2. **Mission §4 partial**: "icon sizes, container widths" (spec.md:9) are absent from ADR-26's role list
   (decisions.md:360-367) and from P01A's deliverable tables (plan.md:42). Fix: add `--icon-*`/`--container-*` roles
   (or an explicit deferral line).
3. **Mission §16 partial**: the achievement `icon/badge` field (spec.md:20) is missing from the ADR-24 catalog
   (decisions.md:303) with no deferral. Fix: add a `glyph`/`badge` field (text glyph is enough) or defer explicitly.
4. **§31 "no critical console errors" unassigned** (spec.md:47; plan.md:251; P08B acceptance work-order.json:375).
   Fix: add a console-error assertion to the walkthrough (G07/P08A) and cite it in P08B.
5. **G01 acceptance omits `streakXp`/`bonusXp` cases** though ADR-24 defines streak blocks +10/+50 and bonus caps
   (decisions.md:294-299; work-order.json:69). Fix: add 7-day-block boundaries, challenge once/period, record max
   3/day, achievement once.
6. **I3/I5 test ownership ambiguous**: ADR-23's table says "test/invariants.test.js unless noted"
   (decisions.md:262-275) but P03B's acceptance names only I1/I2/I7 (work-order.json:159); I3's "app-path test" owner
   is unnamed and I5's seen-marking idempotency is not in P03A's harness acceptance. Fix: name P07 as I3's app-path
   test owner; add `markSeen` idempotency to P03A harness acceptance.
7. **Filename drift**: ADR-27 says `scripts/dashboard-perf.js` (decisions.md:381) while plan/work-order say
   `dashboard-perf.mjs` (plan.md:208; work-order.json:351). Fix: pick one.
8. **P08B human gate inconsistency**: plan says reviewer "agent + human (screenshots/checklist)" (plan.md:221) but
   work-order has `human_gate:false`, `reviewer:"agent"` (work-order.json:379). Fix: set `human_gate:true` or state
   HC-C is the human step.
9. **G06 touches `src/ui/dashboard.js` "consume only"** (work-order.json:318) while P07 is the contract owner
   (decisions.md:522). No concrete G06 change to dashboard.js is named. Fix: drop it from `touches` or name the change.
10. **`totalWords` fallback not in P06B no-regression** though ticket 06 names it as a behavior to preserve
    (issues/06-library-ux.md:27; exists at src/app.js:181). Fix: add to P06B acceptance/no-regression.
11. **Record-count wording**: "8 record types + fastest-wpm-chunk-1/2/3" (plan.md:81) vs ADR-24's 10 ids
    (decisions.md:338). Fix: state the exact id list/count in P04/G05 acceptance.
12. **21-state → module traceability missing**: plan.md:250-253 maps mission sections, not the 21 states; P08B asserts
    "all 21 states" (work-order.json:375) without any module charged with specific rows (e.g. "level-up",
    "no recent activity"). Fix: add a state→owner table; ensure each row has an asserting step before P08B.
13. **app.css custom-property rule contradiction**: plan.md:23 says `app.css` consumes tokens only; plan.md:132 says
    "no new custom properties outside its named sections" (implying inside is allowed); ADR-19 is ambiguous
    (decisions.md:157). Fix: one sentence — tokens.css only, or section-local vars allowed where.
14. **W1 no-regression subset**: P02 omits ADR-10 zero-network (work-order.json:52) from grilling decision 11's
    inventory (grilling.md:37). Fix: add the zero-network re-check to P02.
15. **P02 corrupted-data simulation mechanism unnamed** (work-order.json:51). Fix: name the simulation (delete DB /
    stub `openStore` via CDP) or reuse the P03A harness pattern.
16. **`§` notation collision**: "§13" means mission §13 at plan.md:251 and ADR §13 at plan.md:6/57. Fix: qualify
    ("mission §N" vs "ADR §N").
17. **Ticket 07 copy inventory absent** from ADR-25 and P07 deliverables (issues/07-feedback-loop.md:20). Fix: add a
    copy-inventory output to P07 (or defer explicitly).

---

## Question-by-question disposition

1. **Completeness** — 15/15 owned once; no module outside tickets+ADRs; gaps: §4 icon sizes/container widths (§2),
   §16 icon/badge (§3), §31 console errors (§4).
2. **Dependency correctness** — no cycle; real edges are real; incomplete edges are B1. `events.js` gating the tail is
   correctly encoded (P03B←G01–G03,P04; P07←P03B; G06←P03B).
3. **HITL gate logic** — HC-A batching is binding (grilling 12a, map Notes) and sound *provided* M6 is fixed; the
   cheapest mitigation for the rework risk is to keep P05A/P06A prototypes direction-swappable (single small CSS
   block). HC-B is not a real gate (M1); HC-C is adequately defined (artifacts + recorded review, work-order.json:477-484).
4. **Testability** — pure-lib acceptances are runnable; harness-page acceptances are not (M2); §29 invariants are
   assigned except I3/I5 clarity (minor 6); G01 misses streak/bonus cases (minor 5).
5. **Design-system PENDING** — P01A→P01B slots ADR-26 correctly and no stall exists *if HC-A resolves*; token
   restructure respects ADR-19 except the S6 gap (B2) and the custom-property wording (minor 13).
6. **Risk/rollback** — resume (M4), economy monotonicity is covered (I1 property test, P03B), migration (M5).
7. **Parallelism realism** — G1/G2 touches are genuinely disjoint against the ownership map; hidden shared files
   (`test/harness/*.html`, `scripts/`, walkthrough) are correctly serialized in prose, but not in edges (B1).
8. **Scope** — 20 modules/15 tickets is plausible; P07 is too large (M3); P03A/P06B are watch items.
9. **No-regression subsets** — each wave carries its subset; only P02/ADR-10 gap (minor 14).
10. **Other** — B1/B2 are the two defects I would block on; M1–M6 are fix-in-revision.

## Residual doubts (cannot be resolved from the artifacts)

1. Whether the executor schedules from `blocked_by` or from `parallel_groups`/notes — B1 is collision-free only under
   the latter.
2. Human latency at two sequential checkpoints (HC-A, HC-B) dominates the schedule; no rework budget is planned for a
   CHANGES verdict.
3. P03A/P06B/P07 session realism — if splits happen mid-run, coverage re-citation and walkthrough ordering may drift.
