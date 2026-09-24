# 27: Player fidelity to the approved prototype

**Gap (HC-C finding):** the live player is a small card with a text row; the HC-A-approved `design/player-prototype.html` shows a book page: large ruled stage with the ORP-anchored word set in display serif, goal chip, transport row, Session panel, keyboard map, and the ledger rail with stamps on the margin.

**What to do:** restyle `src/ui/player-view.js` + `styles/app.css` S3 to the prototype: page column (max-width), ruled stage with big serif text and marker ORP underline, progress + elapsed/remaining line, transport (Prev/Play/Next/Restart/±/Exit), goal chip, Session disclosure (goal + typography + modes + chunk size), ? Keys panel, ledger rail (ticks + best stamp). Keep player.js as the only timer, a11y announcements, reduced-motion branch, and all walkthrough behavior.

**Blocked by:** 25.

**Status:** ready-for-agent

**Plan module:** post-run repair (S3 owner: M-P05B)

- [ ] Prototype structure ported (stage, rail, goal chip, session panel, keys)
- [ ] Walkthrough 9c green; no timing/announcement regressions
- [ ] Screenshots 390/1280 match the prototype's structure
