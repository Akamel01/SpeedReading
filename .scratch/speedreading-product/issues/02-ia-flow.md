# 02: ia-flow — information architecture, navigation, session lifecycle

**Type:** grilling (agent drafts, human confirms at checkpoint) · **wayfinder:grilling**
**Category:** enhancement
**Status:** ready-for-agent
**Blocked by:** none

## Question

What is the information architecture and navigation model for the transformed product, and what is the session lifecycle state machine?

Specifically:
- Shell: persistent header/nav vs sidebar vs contextual — what survives across views, what collapses on mobile.
- Journey: Library → prepare/configure → Player → Quiz → award → Session summary → Dashboard. Which steps are views, which are states within a view, which are overlays?
- State inventory: the mission lists ~21 first-class states (first-use, empty, importing, parsing, failed import, ready, active, paused, completed, quiz, quiz completed, achievement unlocked, level-up, streak update, returning, no recent activity, corrupted/missing data, unsupported content, interrupted, restored). Assign each to a surface and a transition.
- Resumable sessions: does an interrupted reading session restore (chunk position, settings, elapsed)? What is persisted and when?
- Where the session summary lives (own view vs dashboard section vs overlay).

## Deliverable

IA doc: navigation model, flow diagram (ASCII), state → surface table, session lifecycle state machine, resumability decision. ADR candidate for the architect.

## Constraints

- Retain the four major concepts (Library, Player, Quiz, Dashboard); no new top-level views without justification.
- Mission §3 journey must be obvious to a first-time user.
- ADR-7: every state keyboard-reachable, SR-announceable; no focus traps.
- Mobile-first collapse behavior must be specified.

## Out of scope

- Visual styling (ticket 01), gamification rules (ticket 04), persistence internals (ticket 03).

## Resolution

(pending)
