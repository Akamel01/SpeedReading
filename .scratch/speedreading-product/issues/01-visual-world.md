# 01: visual-world — design system direction

**Type:** prototype (HITL) · **wayfinder:prototype**
**Category:** enhancement
**Status:** ready-for-human
**Blocked by:** none

## Question

What visual world and design-system direction should the transformed product ship? Candidate A (default): preserve the incumbent folio/ink/marker world and expand it into a full material, elevation, state, and motion system (richer surfaces, real accent roles, stamp/ledger language for gamification, editorial type scale). Candidate B: replace the world entirely.

Resolve by building a cheap, concrete prototype and reacting to it — not by arguing in prose.

## Deliverable

- A local prototype page (shell + player + one gamification surface + dashboard fragment) in the strongest direction, servable via `python3 -m http.server`.
- A written direction: color roles (bg/surface/elevated/border/text/muted/accent/success/warning/error/info/XP/rarity), type scale, spacing/radius/elevation scales, control heights, breakpoints, focus treatment, motion timings + easing, signature element, anti-references.
- Trophy → product mapping table (which Trophy grammar is adopted; how it is re-skinned; what is refused).

## Constraints

- ADR-19 tokens discipline; ADR-7 contrast ≥4.5:1; ADR-10 zero network; ADR-1 no deps.
- Must carry: gamification states (locked/unlocked/rarity/progress), dense dashboard, focused reading mode, mobile → ultrawide, reduced motion, enlarged text.
- Mission §4 bans: rounded-card-everything, gradient spam, glassmorphism excess, childish/neon gamification, giant empty areas.

## Out of scope

- Implementing the full system (that is the execution wave after this ticket closes).
- Copy rewrites, new features.

## Resolution

(pending — human reaction required)
