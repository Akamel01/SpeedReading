# Pass 1 — Apple interaction layer (on the Reading Atelier direction)

Status: motion/material/type values (no code). Next: impeccable critique (ticket 03).

Constraint honored: no spring library (ADR-1 no-dep posture). All motion is CSS `transform`/`opacity` only,
critically-damped in feel; the RSVP engine keeps owning playback timing untouched.

## Response — kill latency

- Press feedback on pointer-down: `.player-btn, .library-item button, nav button { transition: transform 100ms ease-out; } :active { transform: scale(0.97); }`
- No debounce/throttle on any input path; settings apply synchronously to the live view.
- View routing never waits on storage writes (render first, persist behind).

## Motion values (house style: damping 1.0, response ~0.35)

| Interaction | Spec |
|---|---|
| View enter | opacity 0→1 + translateY(8px→0), 180ms, `cubic-bezier(0.2, 0, 0, 1)`; exit mirrors (inverse path, same curve) |
| RSVP chunk change | **no motion** — instant swap (timing integrity + vestibular calm) |
| Margin tick draw-in | opacity + scaleY from top, 240ms, same curve, staggered 30ms per tick on session save |
| Suggestion card | opacity + translateY(4px), 180ms; dismiss reverses along the same path |
| Quiz save status | opacity cross-fade 150ms |

Interruptibility: transitions re-trigger from the live presentation value (re-clicking nav mid-transition restarts from current opacity/offset, never jumps); input never locked during a transition.

## Materials & depth

- Header/nav: translucent folio — `background: rgba(246,244,236,0.72); backdrop-filter: blur(16px) saturate(140%)`, content scrolls beneath. Single translucent layer only (never stacked).
- Page card (RSVP stage surround): solid folio, 1px `--rule` edge, soft shadow `0 12px 32px rgba(26,24,21,0.08)` (heavier than chips so the page reads thicker).
- Scroll edge: gradient mask under the sticky header instead of a hard divider.
- Vibrancy rule: marker (#FFDD33) never carries text; text over blurred chrome uses iron at 600 weight, +0.01em tracking.

## Typography table (size-specific, system stacks)

| Role | Size | Leading | Tracking | Weight |
|---|---|---|---|---|
| Display (titles, big WPM) | clamp(1.75rem, 4vw, 2.75rem) | 1.05 | -0.015em | 600 |
| RSVP stage | 2rem | 1.4 (fixation comfort) | 0 | 500, ORP underlined marker |
| Body/UI | 1rem | 1.5 | 0 | 400/500 |
| Captions/marginalia | 0.8125rem | 1.4 | +0.01em | 400, pencil |
| Data (WPM, %) | 1rem mono | 1.4 | 0 + `tabular-nums` | 500 |

Spacing in `rem` throughout so user text-size scaling never breaks layout.

## Reduced motion / transparency / contrast (all three signals)

- `prefers-reduced-motion: reduce` → all transitions become opacity cross-fades ≤150ms, `transform: none`; margin ticks appear without draw-in; RSVP already motion-free.
- `prefers-reduced-transparency: reduce` → header becomes solid folio, blur off.
- `prefers-contrast: more` → solid surfaces + 1px iron borders on interactive controls.
- Never: full-viewport motion, slow loops, brightness jumps.

## Foundations spot-check (purpose → delight)

- Purpose: nothing added that doesn't serve a workout; candidate cut already: dashboard chart art (numbers + ticks suffice).
- Agency: destructive delete keeps its confirm; settings apply live with no save button.
- Wayfinding: active nav state answers "where am I"; every view keeps its heading; Esc exits player.
- Simplicity: common path (open → play → quiz) stays three gestures; chapter/advanced controls one level deeper.
- Delight target: calm confidence — the margin filling up over weeks.
