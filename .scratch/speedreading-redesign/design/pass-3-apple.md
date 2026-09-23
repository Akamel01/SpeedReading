# Pass 3 — Final apple values

Status: exact values frozen (no code). Next: final buildable spec (ticket 09).

| Interaction | Value |
|---|---|
| View enter/exit | opacity + translateY(8px), 180ms, `cubic-bezier(0.2, 0, 0, 1)`, mirrored |
| Press feedback | scale 0.97, 100ms ease-out, pointer-down |
| Margin tick draw-in | opacity + scaleY, 240ms, 30ms stagger, session save only |
| Suggestion card | opacity + 4px rise, 180ms; mirrored dismiss |
| Quiz status | opacity 150ms cross-fade |
| Chunk change | none, always |

Materials: header `rgba(246,244,236,0.72)` + blur 16px/saturate 140%, single layer; page card solid + rule edge + `0 12px 32px rgba(26,24,21,0.08)`; gradient scroll-edge mask; marker never carries text (iron 600 +0.01em over blur).

Type table: as pass-1 apple (display -0.015em/1.05; RSVP 2rem/1.4; body 1rem/1.5/0; captions 0.8125rem/1.4/+0.01em pencil; data mono tabular-nums), rem spacing.

Fallbacks: reduced-motion → ≤150ms opacity only, no transform, ticks appear static; reduced-transparency → solid header; contrast-more → 1px iron control borders. RSVP motion-free in all modes.
