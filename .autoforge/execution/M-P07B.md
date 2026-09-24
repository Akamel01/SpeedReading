# M-P07B dashboard-summary — final report (orchestrator implemented, reviewed)

No worker dispatched (W4 app.js work is orchestrator-only).

- `src/ui/gamify-viz.js` (additive): wpmChart {comprehension} second quieter series + legend (default off — G05 behavior unchanged, harness still 0 failures); bucket means null-safe for comp (0% is data, absent is null); wordsBars 30-day activity with text labels + empty state.
- `src/ui/dashboard.js`: summary state (exact ADR-25 §19 10-order) + focusSummary() after routing with lastSummaryId-guarded single announcement; log view (StatRow xp+streak, suggestion, always-visible challenges, two-series trends + bars hidden <4 with needs-4 note, empty+CTA at 0, recent-50 toggle >50 only, achievements recent+grid, records list, preserved lap rows).
- `src/app.js`: buildSummary (baseline/moments/xp/level/streak/suggestion), onDone → summary, renderDashboard carries quizzes.
- `styles/app.css` S5: token styles for summary/moments/statrow/trends/bars/toggle + reduced-motion branch.
- `scripts/dashboard-perf.mjs` + `test/harness/dashboard-perf.html`: 1000-session gate, measured 25-27ms (<100ms).
- Walkthrough: 1d (0-session empty), 2f trend note, section-6 summary reroute, 9f (log cards/two-series/bars/cap/achievements/records).

Self-repair: challenge state shape (no .progress wrapper); comp>0 excluded real 0% data (null-safe now); show() refocus stole heading focus (focusSummary after routing).

- Review: APPROVED_WITH_NOTES, no code changes required.
- Evidence: walkthrough 91/1 (fixture only); `node --test` 177/177; perf 25.7ms; app.css custom props 0; innerHTML 0; banned copy 0.

## Dashboard copy inventory (frozen)

Progress · No sessions yet. / No sessions yet. Import a text and run a baseline to begin. · Import a text · sessions · best/avg WPM · avg comprehension · trend · Suggested next target · Accept · Dismiss · Daily/Weekly challenge · Trend needs 4 sessions — keep reading. · Show recent 50 / Show all laps · Achievements · No achievements yet. · Personal records · Start session · Export/Import data · Session summary · Session complete. N wpm, P% comprehension. · vs your average/best · N XP earned · Level N (P% to T) · No streak yet — read tomorrow to start one. · No records broken this lap. · No achievements this lap. · No target suggestion right now. · Dashboard · Read next · Record broken: / Achievement unlocked: / Level up: / Challenge complete: / N-day streak · Dismiss reward · Lap N · best · span drill · experimental · Correct/Not quite/Skipped (via quiz review)
