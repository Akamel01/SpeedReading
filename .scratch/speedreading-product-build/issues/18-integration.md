# 18: Gamification integration

**What to build:** Wire everything together: engine composition into the app, the header HUD showing XP and streak (hidden in player focus mode), seen-marking through the profile repository so reward moments appear exactly once, and legacy v1 data rendering without error.

**Blocked by:** 17 (Dashboard and session summary), 12 (Gamification cards), 13 (Progress visualisations), 07 (Persistence v2 and profile), 08 (Event composition and invariants).

**Status:** ready-for-agent

**Plan module:** M-G06

- [ ] After a real session and quiz: XP > 0, level shown, streak day marked, unlock moment appears once, a second dashboard visit does not repeat it
- [ ] HUD visible across views and hidden in player focus mode
- [ ] A v1 export imports and renders without error
- [ ] Copy grep clean (speed, guilt, fake-social); zero network requests after load; `node --test` green

## Resolution

Closed 2026-09-24 (W5). Orchestrator implemented directly. Review APPROVED_WITH_NOTES (informational). Evidence: walkthrough 98/1 (fixture only); unit 177/177; store harness 11/11.
