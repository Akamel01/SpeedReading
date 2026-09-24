# 28: Dashboard + quiz fidelity to the approved direction

**Gap (HC-C finding):** dashboard/quiz are functional but plain — no card system for stat rows/trends, review rows are bare. The approved direction (`design/direction.md`, prototype's gamification + dashboard fragment) wants cards with serif headings, mono data, marker accents, stamp/moment styling, and the ledger look.

**What to do:** restyle `src/ui/dashboard.js` + `src/ui/quiz-view.js` + `styles/app.css` S4/S5: card sections (StatRow, LevelCard, StreakCard, challenges, trends card, recent-sessions card, achievements, records), summary hero typography, reward-moment stamp styling, quiz review rows as cards with verdict accents. Behavior, aria, copy, perf budget (<100ms) unchanged.

**Blocked by:** 25.

**Status:** ready-for-agent

**Plan module:** post-run repair (S4 owner: M-P07A; S5 owner: M-P07B)

- [ ] Card system applied; summary + log look like the direction
- [ ] dashboard-perf <100ms; walkthrough 9f green
- [ ] Screenshots 390/1280 reviewed

## Resolution

Closed 2026-09-24. Dashboard: card sections (challenges, trends, recent laps, achievements, records), summary typography (serif heading/hero, muted sub), table on surface, bars width capped; quiz: answering/review rows as cards with verdict accents. Behavior, aria, copy, perf unchanged. Evidence: dashboard-perf green (<100ms), walkthrough 100/100 GO, unit 177/177, a11y 17/17, screenshots re-shot.
