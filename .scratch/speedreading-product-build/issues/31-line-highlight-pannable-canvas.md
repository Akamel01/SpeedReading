# 31: Whole-line highlight + pannable canvas + page-width dial

**Why (user direction):** "show the entire page, highlight the entire line, and the view can be changed by dragging the canvas." Matches the line-by-line highlight method (comprehension stable 225–360 wpm in the 2026 Schwalm/Radach/Kuperman study).

**What changed (Page mode):**
- Highlight unit = the whole rendered line (live-measured via shared offsetTop; no stale cache), not an N-word group
- Canvas: fixed-height scrollable page (62vh, border-box), drag-to-pan with pointer capture; a drag never triggers click-to-seek (movement guard); auto-recentre only when the focus line leaves the viewport with margin (no scroll fighting)
- New "Page width" dial (narrow 46ch / medium 62ch / wide 80ch) reflows lines: wider = longer highlight units
- "Group width" dial now applies to Line mode only

**Bugs found & fixed:** scrollIntoView scrolled the window instead of the canvas; content-box sizing gave the canvas 400px of phantom padding; line map could be built before layout (replaced with live measurement).

**Status:** closed 2026-09-24

- [x] Whole-line highlight (walkthrough: 10 words, 1 offsetTop)
- [x] Width dial reflows canvas + line (620->800px, still one line)
- [x] Drag pans (scrollTop 0->292) without seeking; click-to-seek intact
- [x] Walkthrough 106/106 GO; unit 177/177; a11y 17/17; harnesses green
