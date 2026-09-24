# 06: library-ux — content workspace experience model

**Type:** prototype (HITL) · **wayfinder:prototype**
**Category:** enhancement
**Status:** ready-for-human
**Blocked by:** 01 (visual direction)

## Question

What is the library's experience model? Resolve with a prototype, not prose.

- Workspace layout: header (title, counts, import action), search, filter (format, progress state, favorites), sort (recent, title, size, progress, last session), list/grid density.
- Per-item surface: cover/typographic identity, word count, estimated reading time, progress (chapters read / words read), completion state, last session, mastery indicator (WPM/comprehension at this text), favorite toggle, contextual actions (open, chapter pick, delete, export).
- Import workflow: one deliberate surface for file/drag-drop, paste, URL, JSON import; states idle → dragging → parsing → success → failure with recovery; duplicate detection; supported-format messaging; rights/DRM copy (ADR-10).
- Empty states: first-use vs no-results vs all-filtered.
- Mobile: how the workspace collapses; import reachable in one action.
- Delete/confirmations and undo posture.

## Deliverable

Prototype page + written interaction spec (layout per breakpoint, state table, copy inventory). Feeds execution waves C/D and J.

## Constraints

- All existing import paths keep working: file (.txt/.md/.epub/.docx/.pdf), paste, URL (+paste fallback), JSON import/export.
- No new dependencies; no server; ADR-10 posture copy; imported content untrusted (mission §23).
- Existing behaviors: chapter picker, totalWords fallback, import failure alerts → these become designed states, not removals.

## Out of scope

- Player/quiz/dashboard internals; gamification rules.

## Resolution

(pending — human reaction required)
