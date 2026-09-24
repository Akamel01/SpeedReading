# 17: Dashboard and session summary

**What to build:** The full dashboard as a performance centre (primary performance, current progression, recent activity, achievements, long-term trends) plus the session summary as a dashboard state: ten ordered sections, focus to the heading, one consolidated announcement, reward moments sequenced by priority, low-data states, and a 1000-session render budget.

**Blocked by:** 16 (Quiz review), 08 (Event composition and invariants), 15 (Library implementation), HC-B.

**Status:** ready-for-agent

**Plan module:** M-P07B

- [ ] Summary renders all ten sections in order, with focus to the heading and a single announcement
- [ ] Dashboard hierarchy, recent-50 table and aggregate toggle; low-data states at 0 and 1–3 sessions
- [ ] Reward order respected; reduced-motion behaviour correct
- [ ] Perf script: 1000-session render under 100ms; `node --test` green

## Resolution

Closed 2026-09-24 (W4). Orchestrator implemented directly. Review APPROVED_WITH_NOTES (no changes required). Evidence: walkthrough 91/1 (fixture only); unit 177/177; perf 25.7ms <100ms; copy inventory in module report.
