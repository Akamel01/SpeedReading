# 25: Mobile bottom bar covers content (buttons unreachable)

**Bug (reproduced):** at ≤767px the fixed bottom bar renders 120px tall (title + HUD + nav) with no compensating padding on `main`. Hit-test on the last library item's Open button lands on `P.hud` — real taps hit the header instead of the button. Reproduced: `mainPaddingBottom: 0px`, `headerRect {y:580,h:120}`, `lastOpenHit: "P.hud"` at 375x700.

**What to fix:** mobile bar is nav-only (hide `header h1` + `#hud` at ≤767px); `main` gets bottom padding = bar height + `env(safe-area-inset-bottom)`; header gets safe-area padding. Verify at 320/375/430: header ≤64px, no content under the bar, hit tests land on buttons.

**Blocked by:** none (HC-C finding).

**Status:** ready-for-agent

**Plan module:** post-run repair (S1 owner: M-P02)

- [ ] Bar ≤64px at ≤767px; h1/HUD hidden there
- [ ] `main` padding-bottom compensates; safe-area honored
- [ ] Hit test at 320/375/430 lands on content buttons, not the bar

## Resolution

Closed 2026-09-24. Root cause: bar was 120px (h1 + HUD + nav) and a later `#app, body { padding-bottom: 0 }` rule outranked the media-query padding. Fix: nav-only bar at ≤767px (h1/HUD hidden), safe-area padding, `#app` padding-bottom 64px in a later media block. Verified (mobile:false 320/375/430): barH=65, appPadBottom=64px, hit test on last item's Open button = BUTTON. Walkthrough 100/100 GO; unit 177/177.
