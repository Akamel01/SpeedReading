# 05: player-ux — reading player experience model

**Type:** prototype (HITL) · **wayfinder:prototype**
**Category:** enhancement
**Status:** ready-for-human
**Blocked by:** 01 (visual direction)

## Question

What is the player's experience model? Resolve with a prototype, not prose.

- What is visible during reading vs behind progressive disclosure (WPM, progress, elapsed/remaining, section, live indicators) — the mission says do not overwhelm during reading.
- Control model: pause/resume/restart/skip, speed adjustment (steps, presets, gestures?), keyboard map, touch targets.
- Modes: focus/distraction-free/fullscreen, SR manual-advance mode, reduced-motion behavior, typography controls (font scale, alignment), chunk size incl. experimental 3-word.
- Session goals: target WPM, target duration, or words — settable before start; what the session shows against the goal.
- Interruption/restore: pause on tab hide (exists), interrupted-session restore (depends on ticket 02 decision).
- Transitions: start, speed change, pause/resume, finish, mode switch (mission §7).
- Rail/margin: what the existing session rail shows, whether it survives.

## Deliverable

Prototype page + written interaction spec (state × control matrix, keyboard map, motion notes). Feeds execution waves E and J.

## Constraints

- ADR-5 timing engine unchanged unless evidence demands it; ADR-7 announcements at sentence boundaries only; ADR-8 chunk policy; ADR-18 copy rules.
- Reading is the priority: any chrome must be removable.
- Must hold at 320px and ultrawide; enlarged text must not break layout.

## Out of scope

- Quiz handoff (ticket 07), gamification visuals (ticket 01/04).

## Resolution

(pending — human reaction required)
