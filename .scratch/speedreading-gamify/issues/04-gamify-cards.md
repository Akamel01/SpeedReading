# 04: Gamification cards — XP/level, streak + calendar, stamps, unlock moment

**Category:** enhancement

**What to build:** Gamification UI components in the folio/ledger style: XP + level card, streak card with day calendar, achievement stamp grid, unlock moment.

**Blocked by:** 01, 02, 03, and product/01 (visual world + design system direction).

**Status:** ready-for-agent

## Agent Brief

**Summary:** `src/ui/gamify-cards.js` — render builders consuming engine outputs. No app wiring (ticket 06), no chart/podium (ticket 05).

**Desired behavior:**
- Builders return DOM via `h()` (`src/ui/h.js`):
  - `xpCard({ xp, level })`
  - `streakCard({ stats, dayMap, today })`
  - `achievementGrid({ achievements })`
  - `unlockMoment({ achievements })` — renders only newly-unlocked items; dismissible; `role="status"`; no focus steal.
- Visual spec frozen in `design/direction.md` (stamp/ledger language, marker/oxblood accents, type roles). No new palette colors; consume tokens from `styles/tokens.css` only.
- Accessible by construction: badges carry accessible names ("Achievement: First entry — unlocked"); progress uses `role="progressbar"` + aria-valuenow/min/max; calendar is a real list/table with text day labels (never color-only); contrast pairs fixed by the design doc (≥4.5:1).
- Motion: stamp-press entrance with `--dur-tick`/`--ease-calm`; under `prefers-reduced-motion: reduce` → opacity only, no transform, no count-up.

**Key interfaces:**
- `h(tag, attrs, ...children)` from `src/ui/h.js` (frozen signature)
- Engine outputs from tickets 01–03; import only from `src/lib/`
- `styles/app.css`: append a `/* G1 gamify cards */`-marked section; tokens only, no new custom properties

**Acceptance criteria:**
- [ ] `test/harness/gamify.html` renders all components from fixture data in headless Chromium; structural assertions pass (aria names, progressbar values, calendar day labels, reduced-motion branch)
- [ ] `node --check src/ui/gamify-cards.js` clean; no import from `src/app.js` or `src/ui/dashboard.js`
- [ ] Visual match to `design/direction.md` (walkthrough screenshot check)

**Out of scope:** dashboard integration, header HUD, chart/podium, persistence.
