# 14: Player implementation

**What to build:** Implement the frozen player prototype: redesigned reading surface with progressive disclosure, controls (pause/resume/restart/skip, speed steps), modes (focus, typography, chunk size including experimental 3-word), a session goal with progress against it, focus mode, and resume/restore that lands paused at the restored chunk with elapsed time seeded from the snapshot.

**Blocked by:** 09 (Player prototype), 11 (Design system implementation), 02 (App shell and navigation), 07 (Persistence v2 and profile), 13 (Progress visualisations), HC-A, HC-B.

**Status:** ready-for-agent

**Plan module:** M-P05B

- [ ] Walkthrough: goal set, play, live indicators against goal; keyboard map; pause/resume/restart/skip; speed change; chunk size including experimental 3-word
- [ ] Exit → boot → Resume → paused at the restored chunk; pause/resume twice then complete: elapsed equals summed active time (± rounding) and WPM uses it; snapshot cleared on record and on quiz cancel
- [ ] Focus mode hides chrome; announcements at sentence boundaries only; reduced motion defaults auto-advance off
- [ ] No-regression: timing engine, chunk policy, drill copy grep; `node --test` green

## Resolution

Closed 2026-09-24 (W4). Worker output was vapor (dead code, untouched player-view/walkthrough); orchestrator implemented directly. Review APPROVED. Evidence: 12 new walkthrough assertions green; walkthrough 62/1 (fixture only); unit 176/176.
