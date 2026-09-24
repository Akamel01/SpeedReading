# 07: feedback-loop — quiz, session summary, dashboard

**Type:** grilling (agent drafts, human confirms) · **wayfinder:grilling**
**Category:** enhancement
**Status:** ready-for-agent
**Blocked by:** 04 (economy: what is awarded and in what order)

## Question

How do the quiz, the session summary, and the dashboard form one feedback loop?

- Quiz: question progression, answer selection, feedback timing (immediate vs deferred), states (unanswered/selected/correct/incorrect/skipped/completed), review pass, scoring display; seamless Player → Quiz transition; the existing authoring mode (ADR-12) must survive.
- Session summary: content and order (mission §19); which gamification moments appear here vs on the dashboard; the "what to train next" recommendation (uses the existing adaptive suggestion, ADR-9); comparison to own baseline only.
- Dashboard: hierarchy (primary performance → current progression → recent activity → achievements → long-term trends), exact card set, chart choices (WPM + comprehension trend, words, XP/level), filters (per text? time range?), empty and low-data states.
- What each surface shows when a session is in progress vs complete.
- Reward moment sequencing: when XP/level/achievement/streak/PR moments fire and how they queue (mission §11) — including reduced-motion and SR announcements.

## Deliverable

Interaction spec + wireframe-level layout descriptions for quiz, summary, dashboard; reward-sequencing table; copy inventory. Feeds execution waves F/I/J.

## Constraints

- Existing scoring/authoring semantics unchanged (ADR-12, quiz record shape); comprehension presented as trend, never absolute claim (ADR-4).
- Dashboard must stay readable at 320px and with 1000+ sessions (aggregation/downsampling).
- ADR-7: results announced politely; no focus theft on reward moments.

## Out of scope

- Visual style (ticket 01); engine internals (tickets 03/04).

## Resolution

(pending)
