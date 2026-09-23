# Pass 2 — Apple interaction layer (on the Stopwatch direction)

Status: motion/material/type values + deltas vs pass 1. Next: impeccable critique + verdict (ticket 06).

## Deltas vs pass-1 apple layer

- Same house motion curve and interruptibility rules; response tightened to ~0.3 (snappier instrument feel): view enter 150ms, rows 150ms.
- Materials retinted for the cool palette (below); type table inverted per pass-2 roles.
- LIVE dot: opacity pulse 1Hz is the single ambient animation; killed entirely under reduced motion.

## Motion values

| Interaction | Spec |
|---|---|
| View enter | opacity + translateY(6px→0), 150ms, `cubic-bezier(0.2, 0, 0, 1)`; mirrored exit |
| Lap row enter | opacity + translateY(4px), 150ms, stagger 24ms on session save |
| LIVE dot | opacity 1↔0.35, 1000ms cycle; `prefers-reduced-motion` → static signal dot |
| Chunk change | none (same constraint) |
| Press feedback | scale 0.97, 100ms (same) |

## Materials & depth

- Top readout bar: translucent dial — `rgba(236,238,241,0.78); backdrop-filter: blur(18px) saturate(150%)`, sticky; single layer.
- Stage card: solid dial, 1px `--hair` edge, shadow `0 10px 28px rgba(20,24,29,0.10)`.
- Signal (#FF4D00) never carries text; deltas in signal for gains, slate for losses; digits tabular always.

## Typography table

| Role | Size | Leading | Tracking | Weight |
|---|---|---|---|---|
| Readout | clamp(2.5rem, 7vw, 4rem) | 1.0 | -0.02em | 800 |
| Titles | 1.5rem | 1.1 | -0.01em | 700 |
| Reading (RSVP, serif) | 2rem | 1.45 | 0 | 500 |
| Body/UI | 1rem | 1.55 | 0 | 400/500 |
| Captions | 0.8125rem | 1.4 | +0.01em | 400, slate |
| Data | mono tabular-nums | 1.4 | 0 | 500 |

rem spacing throughout. Fallbacks (reduced motion/transparency/contrast) identical in structure to pass 1, retinted.
