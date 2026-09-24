# 05: Progress viz — WPM ledger chart + personal-best podium

**Category:** enhancement

**What to build:** Two dashboard visualizations in the ledger style: an ink-line chart of session WPM over time, and a personal-best podium (top 3 laps by WPM — you vs. your past self).

**Blocked by:** 04 (shared `styles/app.css` + `test/harness/gamify.html`; sequential append).

**Status:** ready-for-agent

## Agent Brief

**Summary:** `src/ui/gamify-viz.js` — hand-rolled SVG (no chart dependency, ADR-1). Data from existing `sessionTicks`/`summarize`.

**Desired behavior:**
- `wpmChart({ sessions })`: single ink polyline over a ruled-paper grid; x = session order, y = WPM; comprehension as a quieter second line or below-threshold markers; accessible summary text + per-point `<title>`; empty state ("No laps yet"); no NaN path data at 0 or 1 sessions.
- `bestPodium({ sessions })`: top 3 by WPM (ties → earliest), #1 marked with a marker-yellow rosette; explicitly local ("your fastest laps"), never social/global; each entry shows lap number, WPM, comprehension.
- Animation ≤240ms line-draw; reduced-motion → static.

**Key interfaces:**
- `sessionTicks(sessions)` / `summarize(sessions)` from `src/lib/metrics.js` (frozen)
- SVG built with `document.createElementNS` inside this module only (verify `h()` namespace support first; if absent, local helper stays in this file)
- `styles/app.css`: append `/* G2 gamify viz */` section; tokens only

**Acceptance criteria:**
- [ ] `test/harness/gamify.html` includes both components; assertions pass (3 podium slots from ≥3 sessions; chart point count = session count; both empty states)
- [ ] `node --check src/ui/gamify-viz.js` clean; no new dependency; no `fetch`
- [ ] Reduced-motion static branch verified in harness

**Out of scope:** zoom/pan, JS tooltips, chart export, multi-text filtering.
