# Review r2 — ui-dashboard (`src/ui/dashboard.js`, `test/harness/dashboard.html`)

Verdict: **APPROVED_WITH_NOTES**

Reviewer: autoforge-reviewer (read-only, re-review). Date: 2026-09-22.
Prior review: `.autoforge/reviews/ui-dashboard.md` (CHANGES_REQUIRED, F1–F5).
Scope: `src/ui/dashboard.js`, `test/harness/dashboard.html`, `src/lib/metrics.js`. No source files modified.

## Prior blockers — all resolved

| Prior | Status | Evidence |
|---|---|---|
| F1 `querySelector=` typo / construction throw | Fixed | Import section verbatim: `5:import { summarize } from '../lib/metrics.js';` — no `querySelector` token anywhere; `grep -n -E "getElementById|id = |querySelector=|= *suggestNextWpm|fetch\(|setTimeout|setInterval" src/ui/dashboard.js` → exit 1 (zero matches). Probe: `construct.ok; root children = 6`. |
| F2 `suggestNextWpm` misused with array | Fixed | Module no longer imports or calls it (`grep suggestNextWpm src/ui/dashboard.js` → only zero hits; `summarize` at 5/115). Render payload drives the card: `121: pendingSuggestion = typeof suggestion === 'number' && Number.isFinite(suggestion) ? suggestion : null;` then `122–127` show only when `pendingSuggestion > 0`. Probe: `suggestionShown = true | text = "Suggested next target: 141 wpm "` for `suggestion: 141`; hidden again for `suggestion: null`. |
| F3 invented ids / re-created root | Fixed | Every node uses `.className` only (lines 9, 13, 16, 22, 26, 29, 33, 45, 98); probe `root.ids = ["provided-root"]` — no `.id` writes; children appended to the provided `root` (line 49), document used only for `createElement`. |
| F4 null `comprehensionPct` shown as `0%` | Fixed | `105–107`: `typeof session.comprehensionPct === 'number' ? ... : '—'`. Probe row with `comprehensionPct: null` → `["9/22/2026","baseline","2","128","—"]`. |
| F5 raw float averages | Fixed | `116: const avgComp = Math.round(stats.avgComprehension * 10) / 10;` and all interpolations wrapped in `Math.round` (line 119). |

## Required checks (real outputs)

1. `node --check src/ui/dashboard.js` → `node --check exit=0`.
2. `python3 -m http.server 8089` + `curl` → `harness_status=200`, `module_status=200`.
3. Grep (F1 pattern set) → `grep exit=1`, zero matches (no ids, no `getElementById`, no `querySelector=`, no `suggestNextWpm` misuse, no `fetch(`, no `setTimeout`, no `setInterval`).
4. Runtime probe with minimal DOM stub (`/tmp/probe-dash-r2.mjs`, `document = { createElement }` only) against the real module and the harness's exact call shape (`createDashboard(root, {...}); dash.render({sessions})`):
   - `construct.ok; root children = 6; ids in subtree = ["provided-root"]`
   - Empty state: `empty.summary = "No sessions yet."`, `empty.card.hidden = true`, `empty.visible = true`, suggestion text empty, `startBtn.disabled = true`. Accept click in this state: `accept.calls.after.click = []` (guard `typeof pendingSuggestion === 'number'` holds).
   - With a session + `suggestion: 141`: card visible, `accept.calls.after.click.with.suggestion = [141]`, `accept.calls.before.click = []` — `onAcceptWpm` fires only from the Accept click handler (lines `64–67`), no auto-apply, no timers/fetch/store.
5. `summarize(sessions)` is the sole metrics call in render (`115: const stats = summarize(sessions);`); suggestion is read from the render payload only.

## Findings (non-blocking)

1. **MINOR — worker evidence doc is stale.** `.autoforge/execution/ui-dashboard.md` still claims "uses summarize ... and suggestNextWpm for optional suggestion" and suggests port 8096. Current module correctly does not import `suggestNextWpm`; served on 8089 per this review's task. Update the evidence doc so completion evidence matches the shipped file.
2. **MINOR — Start button is dead in the only harness.** `startBtn.disabled = lastTextId === null` (line 128) and `lastTextId` is set only from `session.textId` (line 110). Harness sessions (dashboard.html:37–39) carry no `textId`, so the probe shows `startBtn.disabled = true` even after render with 3 sessions, and `onStartSession` is unreachable in the harness walkthrough. Add a `textId` to one harness session (or decide the disabled rule is intentional) before app integration exercises "Start session".
3. **LOW — robustness note.** `render({sessions})` delegates to `summarize` (which guards non-arrays) but `renderSessions` does `sessions.length`/iteration without a guard. Contract callers pass arrays, so no action required now; if a defensive normalisation is wanted later, one line in render (`sessions = Array.isArray(sessions) ? sessions : []`) covers it. Explicitly out of scope for this fix cycle.

## Regression / integration notes

- Only caller is the harness (`rg createDashboard` → module + dashboard.html only); no other module regressed by this change.
- Contract shape intact: `createDashboard(root, {onStartSession, onExport, onImportJson, onAcceptWpm}) -> {render({sessions, suggestion})}`; classes-only naming leaves `app.js` free to own element ids.
- `node --test test/` unaffected (dashboard has no unit test file); harness load is the executable check and it now constructs and renders without error under the probe.

Verdict rationale: all five prior blockers verified fixed with executable evidence; remaining items are documentation freshness and harness coverage, none affecting runtime correctness. **APPROVED_WITH_NOTES**.
