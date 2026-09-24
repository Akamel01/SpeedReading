# 01: Visual direction prototype

**What to build:** A cheap, concrete prototype of the product's visual world — shell, player, one gamification surface, dashboard fragment — plus a frozen direction document covering every design-system role (color, type, space, radius, elevation, control heights, icon sizes, container widths, focus, motion), a signature element, anti-references, and a Trophy-to-product mapping table. The default direction is to preserve and expand the incumbent folio/ink/marker world; the prototype proves or disproves it. The ticket closes only on the human's recorded reaction.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Plan module:** M-P01A

- [ ] Prototype serves locally and renders all four regions at 390px and 1280px with no horizontal overflow
- [ ] Direction doc defines every design-system role the architecture requires, including icon sizes and container widths; contrast pairs listed with computed ratios ≥4.5:1
- [ ] Zero network requests after load; no dependencies added
- [ ] Trophy mapping table states what is adopted, re-skinned, or refused
- [ ] Human reaction recorded (HC-A: APPROVE or CHANGES list) — closing criterion

## Resolution

Approved 2026-09-23 (HC-A). Artifacts: `design/direction.md` (all ADR-26 roles keyed with values, 13 recomputed contrast pairs, Trophy mapping, signature element: the stamp) and `design/prototype.html` (four regions, overflow-verified at 390/1280). W2 fills these values only.
