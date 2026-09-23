# Review — ui-dashboard (`src/ui/dashboard.js`, `test/harness/dashboard.html`)

Verdict: **CHANGES_REQUIRED**

Reviewer: autoforge-reviewer (read-only). Date: 2026-09-22.
Contract source: plan.md §1a/§1b, ADR-9, ADR §4 sessions record, worker evidence `.autoforge/execution/ui-dashboard.md`.

## Checks run (real outputs)

1. `node --check src/ui/dashboard.js` → exit 0 (syntax only; see F1 — passes while runtime is broken).
2. `python3 -m http.server 8092` + `curl -s -o /dev/null -w "%{http_code}" http://localhost:8092/test/harness/dashboard.html` → `200`. Note: worker doc says port 8096; served per task on 8092.
3. `grep -n "summarize\|fetch\|setTimeout\|setInterval\|localStorage\|store" src/ui/dashboard.js` → only:
   - `2:import { summarize, suggestNextWpm } from "../lib/metrics.js";`
   - `65: const summary = summarize(sessions.map(...))`
   No `fetch`, no timers, no store import. Required import is real and used.
4. Runtime probe (`node` with minimal DOM stub mirroring `Element.prototype.querySelector` writability, `/tmp/probe-dash.mjs`):
   ```
   THROW: TypeError: importInput.addEventListener is not a function
   suggestNextWpm(sessions-array) = 60 | with last={wpm:128,comp:90} = 141
   ```
   `createDashboard(root, {...})` throws synchronously; `dash.render(...)` in harness line 41 is never reached in any browser.

## Findings

**F1 — BLOCKER: typo kills the module at construction.**
`src/ui/dashboard.js:31`: `const importInput = container.querySelector="#import-file";` — `=` instead of `(`. This is a member assignment (so `node --check` passes), leaving `importInput` as the string `"#import-file"`. `src/ui/dashboard.js:36` then calls `importInput.addEventListener(...)` → `TypeError: importInput.addEventListener is not a function`. Injection point: the call is reached before `render` at line 153 and before the harness can store the returned API (`test/harness/dashboard.html:28`). Nothing in the harness can render; import/export wiring (line 32–49) is unreachable.
Fix: `container.querySelector("#import-file")`. Add one runnable browser check (harness load with zero console errors) — `node --check` proves nothing here.

**F2 — BLOCKER: suggestion fallback is called with the wrong signature and shows a bogus Accept card.**
`src/ui/dashboard.js:129-132`: when `suggestion` is not a number it calls `suggestNextWpm(sessions)` (array). `metrics.js:73-75` requires `(lastWpm, lastComprehensionPct)`; a non-finite first arg returns `60` — probe output above (`suggestNextWpm(sessions-array) = 60`, vs correct `suggestNextWpm(128, 90) = 141` for the harness's last session). Consequences: (a) `render({sessions:[],suggestion:null})` renders a "Suggested next target: 60 wpm" Accept button in the empty state (lines 133-143), because `currentTargetWpm = null` (line 134) and `null !== 60` (line 135); (b) with real sessions the displayed suggestion is always 60 regardless of comprehension. Hide/compare logic at lines 134-135 is otherwise correct when a proper `suggestion` number is passed (hidden if equal to last session `targetWpm`). Note line 134 reads `sessions[last].targetWpm`, which matches ADR §4 (line 144), not a caller-supplied "current target".
Fix: skip suggestion when `sessions.length === 0`; compute from last session: `suggestNextWpm(last.wpm, last.comprehensionPct)`, or honor only the passed `suggestion` (ADR-9 permits either; current code does neither correctly).

**F3 — MAJOR: invented ids violate §1b ownership rule; possible duplicate `#view-dashboard`.**
plan.md §1b line 94: views "may add classes (not ids)". Module writes ids `#view-dashboard`, `#export-json`, `#import-json`, `#import-file`, `#summary`, `#sessions`, `#suggestion-area`, `#start-session`, `#accept-wpm` (lines 16-24, 31, 55, 139 — all inside `container.innerHTML`). If `app.js` passes the shell's `#view-dashboard` section as root, line 16 nests a second element with the same id. The hidden `#start-session` surface (lines 53-60) is dead UI not in the frozen contract (line 76 only requires the callback).
Fix: add classes inside the view; drop or expose the start control per contract; never re-create `#view-dashboard`.

**F4 — MINOR: null comprehension rendered as `0%`.**
`src/ui/dashboard.js:95`: `const comp = s.comprehensionPct ?? 0;` — ADR §4 line 144 allows `comprehensionPct: null` (quiz not taken). Table then shows `0%`, indistinguishable from a real zero; `metrics.js:37` treats null as 0 the same way. Contract does not specify, but ADR-9's interpretability goal argues for `—`/`N/A`. Confirm intended display before changing.

**F5 — MINOR: summary lines print raw floats; verify with harness aggregate.**
`metrics.js:42-43` return unrounded `avgWpm`/`avgComprehension`; dashboard line 84 interpolates them directly, so avg is only rounded when the fallback at lines 70-75 triggers. Harness sessions (comprehension 86/78/90) would print `Avg Comprehension: 84.66666666666667%`. Fix: round at display site. Also: worker evidence (execution doc line 7) cites only `node --check` and a port that differs from the spec — insufficient; browser-load smoke proof required with F1 fix.

## Contract status snapshot

- Pass: `summarize` imported from `../lib/metrics.js` and used (lines 2, 65); callback-only wiring (`onAcceptWpm` invoked solely in click handler line 143; no auto-apply); no store/fetch/timers; empty-state branch exists (lines 121-123); trend badge (line 85); experimental label at `chunkSize === 3` (line 96); table columns match (lines 97-103, headers lines 111-115); harness imports the real module (line 25) and includes one `chunkSize: 3` session (line 39) and one `baseline` (line 37).
- Fail: runtime construction (F1), suggestion semantics (F2), DOM id discipline (F3).

Re-review after F1/F2 fixes; F3 before app integration; F4/F5 minor.
