# 30: Highlight width dial + centred-line fixation mode

**Why (research):** the perceptual span is 3–4 chars left + 14–15 chars right of fixation — the fixated word plus ~2 words (Schotter/Rayner); slow readers asymptote with a 2-word window, fast readers with 3 (Rayner, Slattery & Bélanger 2010). So width is adjustable but the evidence-backed band is 2–3 words; wider groups are phrase pacing, not one-fixation training (confirmed by the 2026 line-by-line highlight study: comprehension stable 225–360 wpm, drops at 405).

**What:** `highlightWidth` setting (1–6 words, default 2) controlling the fixation group in Page and Line modes; word-precise highlighting (groups may straddle engine chunks); new `line` reading mode: one fixation group centred on ruled paper with the neighbouring groups faint above/below; click the next line to advance. RSVP unchanged.

**Blocked by:** none.

**Status:** closed 2026-09-24

- [x] Width select 1–6, persisted; groups exactly N words (walkthrough: width 4 → 4 words)
- [x] Line mode centred group + faint neighbours; RSVP toggle round-trip
- [x] Walkthrough 105/105 GO; unit 177/177; a11y 17/17; harnesses + perf green
