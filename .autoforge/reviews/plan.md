# Plan Review — SpeedReading Trainer (pre-execution, adversarial)

- Reviewer: autoforge-reviewer (plan critic, independent of planner)
- Date: 2026-09-22
- Inputs read: `.autoforge/plans/plan.md`, `.autoforge/execution/work-order.json`, `.autoforge/architecture/decisions.md`, `.autoforge/architecture/report.md`, `.autoforge/requirements/grilling.md`, `.autoforge/discovery/{report, tracker-index}.md`, `.autoforge/state.json`, `.autoforge/decisions/log.md`
- Method: full read of the plan pair + contracts; cross-checked dep edges, touches, interface copies, and acceptance runnability. No execution has started; nothing was modified.

## Verdict: CHANGES_REQUIRED

The plan is unusually complete for a 64k-window planner: objective coverage is good (RSVP 1–3 chunks, ORP, baseline, quiz, progress all mapped to modules), the §6 file coverage table is accurate (15/15, no duplicated paths — offsets: `test/*.test.js` names are unique per module), dependency edges G1→G5 are consistent with declared imports, and the interface copy in `plan.md:13-61` matches `decisions.md:81-130` verbatim apart from the two defects below. However, two integration-breaking gaps (unowned visibility wiring; unstated Node floor + `package.json` ban) plus a thin DOM contract for three parallel UI workers mean the plan should not enter execution as-is. All fixes are plan-artifact edits.

## Findings (ranked)

### F1 — HIGH — Visible-tab pause is an unowned, unnamed interface; app will not compile against player
Evidence:
- `decisions.md:33`: "On `visibilitychange -> hidden` the player pauses."
- `plan.md:176`: acceptance demands "hidden-tab pause is a single exposed hook the browser adapter calls (engine test asserts pause-on-hide semantics)."
- `plan.md:25` freezes `createPlayer(...) -> {play, pause, toggle, seek(i), step(+1|-1), setWpm(n), getState, on(event, cb)}` — no hook member; `decisions.md:93` same.
- `plan.md:220` (app acceptance) never mentions visibility wiring; `plan.md:202` forbids `player-view` owning timers, without assigning the listener anywhere.
Impact: `lib-player` worker invents a hook name (or asserts semantics of `pause()`), `app` worker wires `visibilitychange` to a possibly different name, or nobody wires it — silent failure of ADR-5 mitigation with the browser tests (M14) still passing.
Required change: in `plan.md` §1 add the hook to the frozen signature (recommended: `player.notifyVisibility(hidden:boolean)` or an explicit statement that `pause()`/`play()` are the adapter surface), and add "app registers `document.addEventListener('visibilitychange', ...)` and maps hidden→pause" to the M14 acceptance (`plan.md:220`) and work-order `app` module; mirror the named hook in `lib-player` acceptance (`work-order.json:124`).

### F2 — HIGH — Toolchain floor is unstated and a banned file is the standard fix
Evidence:
- `plan.md:298`: "No package.json, no bundler config ..." (same ban `work-order.json:264`).
- `plan.md:118`, `plan.md:158`, `plan.md:184` etc.: every lib acceptance is `node --test test/<name>.test.js` on `.js` files using ESM `import`.
- `decisions.md:9`: "plain ES modules under `src/`, ... importable by `node --test`"; `decisions.md:41`: "tests run with zero installs (`node --test test/`)".
- `report.md:36` claims "globals available ≥ Node 18", but `decisions.md:21` relies on `DecompressionStream('deflate-raw')` (added in Node ≥20.12/21.2) and ESM syntax auto-detection for `.js` without `"type":"module"` only defaults on Node ≥22.7.
- Verified locally: Node v26.7.0 satisfies both (`esm-detected function`; `deflate-raw: yes`).
Impact: a worker on Node 18/20 sees all M2–M5, M7, M9, M10 acceptances fail with `SyntaxError: Cannot use import statement outside a module` (or a deflate-raw `TypeError`), then either burns budget or adds an out-of-scope `package.json`, which the guard at `plan.md:298` explicitly forbids.
Required change: pick one and encode it — (a) amend §6/out-of-scope to allow a minimal `package.json` with `{"type":"module"}` as a shell-owned output (add to `shell` touches, coverage table `plan.md:274-294`, and work-order), or (b) keep the ban and add "Node ≥ 22.7 required" to `docs-assets` README acceptance (`plan.md:166`, `work-order.json:112`), to the run instructions, and correct `report.md:36`.

### F3 — MEDIUM-HIGH — §1b DOM contract too thin for three independent G3 workers
Evidence:
- `plan.md:86`: CSS contract is only "`fontScale`/`textAlign` variables" — no custom-property names, no unit/scale semantics.
- `plan.md:202`: M12 acceptance requires "ORP character at a fixed x (visual check at two font scales)" — the mechanism to change scale is undefined, and no module acceptance creates a control that writes those variables (see F6).
- `plan.md:83` pins `#view-*` section ids, but §1b never states whether `index.html` pre-builds inner controls or each view creates its own; shell and each view can both render controls into the same sections with no id ownership rule.
- ORP anchor has no class/attribute contract; `player-view` and `app` cannot agree on how CSS anchors it.
Impact: shell and three view workers can produce colliding or missing DOM; the "two font scales" check is unrunnable without a named knob.
Required change: extend `plan.md` §1b with (i) exact names/semantics (`--font-scale: <number>`, `--text-align: center|left`), (ii) ownership rule (recommended: shell ships empty `#view-*` sections + `#live-region`; each view creates all its own children), (iii) ORP anchor contract (e.g. the ORP character is wrapped in `<span class="orp">` and CSS guarantees the fixed anchor point).

### F4 — MEDIUM — G3 browser "stub harness" is a required artifact that no module owns
Evidence:
- `plan.md:194`: "browser on the served shell with a stubbed view harness"; `plan.md:202` (player-view) and `plan.md:210` (quiz/dashboard) are browser checks too; `work-order.json:148,160` repeat the requirement.
- Each G3 module's `touches` is only its view file (`plan.md:193,199,207-209`), and `plan.md:265` asserts "no file appears in two modules".
Impact: three parallel workers each need a harness page, but the only allowed paths are per-view `.js` files; workers either write undeclared files (breaking the coverage/disjointness claim and risking a same-path collision such as `test/harness.html`) or improvise devtools-console stubs and the acceptance is not reproducible.
Required change: decide and encode — either declare per-view harness files as owned outputs (e.g. `test/harness/ui-library.html` etc. added to module `touches` + coverage + work-order), or rewrite the G3 acceptances to "served shell + devtools-console stub, no harness file written".

### F5 — MEDIUM — M6 `lib-store` acceptance is partly untestable as written
Evidence:
- `plan.md:150`: "`importAll` rejects a wrong `schemaVersion` and replaces data only after confirm; quota failure surfaces a readable error, not a silent drop."
- `decisions.md:123`: `importAll(json)` has no confirm parameter; confirm is a UI concept, and no §1a view contract (`plan.md:68-75`) says who confirms.
- The stated procedure is "browser console on the served app" (`plan.md:150`) — exercising a storage-quota error from the console is not reliably possible without a prescribed simulation.
Impact: reviewer cannot fail the worker on "confirm" and "quota", so the acceptance is decoration at best, and the confirm responsibility may be implemented nowhere (or in both `ui-library` and `app`).
Required change: in `plan.md` §2 M6, scope acceptance to schemaVersion validation, round-trip, and export shape; state explicitly in §1a/§3 that `app` (or `ui-library` `onImportJson`) owns the replace-after-confirm flow, and either drop the quota clause or prescribe one concrete simulation (e.g. monkeypatch `put` to reject or use DevTools quota override).

### F6 — MEDIUM — Settings surface is in the data model and demanded by grilling, but no module exposes it; M14 asserts persistence with no writer
Evidence:
- `decisions.md:147-148` settings record: `wpm, chunkSize, orpEnabled, adaptiveSuggestions, reducedMotion:'auto'|'on'|'off', fontScale:1, textAlign:'center'`.
- `grilling.md:17`: "Implement accessible controls for font size, color contrast, and pause/play."
- `plan.md:220` (M14): "reload page → text, settings, session persist" — but no module in `plan.md` §2 (or `work-order.json` modules) accepts a settings read/write control; grep finds `fontScale` only at `plan.md:86`/`decisions.md:148`.
Impact: MVP ships a settings store nothing can change; font-size control (an explicit grilling requirement) is unmet; M14's "settings persist" cannot be exercised.
Required change: add settings controls to an existing module's acceptance — recommended `ui-player-view` for wpm/chunkSize/fontScale/textAlign/reducedMotion-off overrides (it already owns presentation) or `shell` — and add one M14 line asserting a settings change survives reload; alternatively amend `plan.md` §6 to descope adjustable settings with rationale (but then fix `grilling.md:17` coverage claim in `plan.md:5`).

### F7 — MEDIUM — EPUB cut protocol overclaims "collateral none"; late real-book cut is disallowed by its own gate wording
Evidence:
- `plan.md:272`: "Because `pipeline.js` uses dynamic import and `ingest()` already returns the EPUB shape only from that path, no other module changes." Same claim `work-order.json:238` ("collateral: none").
- `plan.md:184` acceptance only checks "module loads with `epub.js` absent" — nothing defines what `ingest({name:'x.epub'})` throws after the delete; a bare dynamic-import rejection is a module-load error, contradicting the readable-error contract `decisions.md:21` and the ADR-10 UX posture.
- `plan.md:272` also says "Cut is allowed only at M7's gate (fixture tests failing on real-world EPUBs...)", but the real-world check is deferred to M15 step 2 (`plan.md:232`, `work-order.json:196`); fixture tests cannot fail "on real-world EPUBs", so the only gate that can genuinely trigger the cut is outside the allowed gate window.
Impact: cut path ships a cryptic error for `.epub` files; if the Gutenberg gate fails at M15, the protocol as written forbids the cut.
Required change: add to M10 acceptance (`plan.md:184`, `work-order.json:136`): "`ingest({name:'x.epub'})` with `epub.js` absent rejects with `UnsupportedFormatError('EPUB support not installed')`"; amend §4/`epubCutProtocol` to permit the cut at M15 step 2 failure and to state the pipeline wrapper for the missing-module case. (Cut remains safe: delete-4-files + dynamic import is otherwise no collateral, and no irreversible data risk.)

### F8 — MEDIUM — Two modules are oversize for one worker session; `app` acceptance duplicates M15 verification
Evidence:
- `plan.md:219`: `app` blocked_by 12 modules; `plan.md:220` bundles import → baseline → 1/2/3-word play → quiz → dashboard → reload persistence → zero-network → single-view routing.
- `plan.md:233,235`: M15 already owns the same reload/persistence walkthrough and the zero-request/`fetch(` privacy pass — duplicated work item, and the app worker's completion depends on work M15 is chartered to verify independently.
- Biggest non-app unit: `epub-import` — ZIP central directory + inflation + OPF/spine + XHTML strip + 2 test files + binary fixtures + 4 error classes in one session (`plan.md:153-158`); close third: `ui-quiz-dashboard` (merged two views, `plan.md:205`).
Required change: trim M14 acceptance to integration seams (`node --test test/` green, one happy-path import→play→quiz→dashboard flow, view routing) and leave full persistence/zero-network/a11y evidence to M15; split `ui-quiz-dashboard` into two G3 child sessions now (already permitted at `plan.md:268`) and consider splitting `epub-import`'s test-fixture work from parser implementation or lowering its scope to method 0/8 happy path + explicit rejects.

### F9 — LOW-MEDIUM — Grilling acceptance item (d) "4-week pilot plan" is undelivered and unmentioned
Evidence:
- `grilling.md:19`: validator includes "(d) 4-week pilot plan".
- `plan.md:225` limits M15 to "the acceptance criteria in `grilling.md:61-65`", and no module output includes a pilot plan (`plan.md:166` README list omits it; `work-order.json:112` same).
Impact: a stated acceptance criterion is silently dropped, weakening the plan's completeness claim vs `plan.md:5`.
Required change: either add a short "4-week pilot plan" section to the `docs-assets` README acceptance (`plan.md:166`, `work-order.json:112`) or state the descope with rationale in `plan.md` §0/§6.

### F10 — LOW — Frozen `player` signature references an undefined identifier; one source artifact carries a no-op leftover
Evidence:
- `plan.md:25` / `decisions.md:93`: `schedule=rAF` — `rAF` is not a browser/Node global (`requestAnimationFrame` is); a literal default throws `ReferenceError` at call time, and no artifact says browser callers must inject `schedule`.
- `decisions.md:96`: `nextDelay(chunk, wpm) -> 60000/wpm * (chunk.words.length===0?1:1)` — a no-op factor that the plan correctly drops (`plan.md:28`), indicating an unfinished edit in the frozen source.
Impact: app integration risk if the worker implements the default naively; minor review noise otherwise.
Required change: in `plan.md` §1 state "browser callers inject `now`/`schedule` (`app.js` passes `performance.now`/`requestAnimationFrame`); defaults are test convenience" or change the default to `globalThis.requestAnimationFrame`; optionally clean `decisions.md:96` to `60000/wpm`.

## Notes checked and found sound

- Dep edges: `lib-player→lib-orp`, `lib-pipeline→lib-text` match declared imports (`plan.md:175,183`); G3 views blocked only by shell already-frozen modules whose interfaces are pinned in §1/§1a; `app` blocked_by is complete (a11y via shell, sample.txt is data from wave 1).
- Parallel safety: G1 eight-way and G3 three-way `touches` are genuinely file-disjoint; no shared `test/` path; `node --test test/` in M14 only reads.
- Testability of lib acceptances is otherwise concrete and falsifiable; `orpIndex` boundaries, `total=0` pct, `elapsedMs=0` guard, seed determinism all map to executable assertions.
- Rollback: EPUB cut deletes 4 files, pipeline dynamic import keeps TXT path; no irreversible risk pre-execution.

## Required changes (actionable summary)

1. `plan.md` §1 + M9/M14 acceptance: name and assign the visibility-pause hook (F1).
2. `plan.md` §6 / `docs-assets` README acceptance + `report.md:36`: pin Node ≥22.7 or allow `{"type":"module"}` `package.json` (F2).
3. `plan.md` §1b: pin CSS variable names, inner-control ownership, ORP anchor contract (F3).
4. G3 harness: declare per-view harness paths or ban harness files in acceptance (F4).
5. M6 acceptance: scope to testable items; assign confirm to app/ui-library; drop or prescribe quota simulation (F5).
6. Add settings controls to a module acceptance or descope explicitly (F6).
7. M10 acceptance + §4/`epubCutProtocol`: readable error for `.epub` with `epub.js` absent; allow cut at M15 step 2 failure (F7).
8. Trim M14 acceptance; split `ui-quiz-dashboard`; consider splitting `epub-import` (F8).
9. Deliver or descope the 4-week pilot plan (F9).
10. Clarify `schedule` injection default; clean `decisions.md:96` (F10).

Re-review after edits: F1–F4 must be reflected in both `plan.md` and `work-order.json` (single source mismatch would re-open them).
