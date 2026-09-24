# 03: domain-persistence — event model + persistence v2

**Type:** research + grilling (AFK) · **wayfinder:research**
**Category:** enhancement
**Status:** ready-for-agent
**Blocked by:** none

## Question

What is the domain event model and the persistence v2 design?

- Event list: `SESSION_COMPLETED`, `SESSION_QUIZ_COMPLETED`, `PERSONAL_RECORD_SET`, `STREAK_MAINTAINED`, `ACHIEVEMENT_UNLOCKED`, `LEVEL_UP`, `CHALLENGE_PROGRESSED`, … exact names + payloads + idempotency keys.
- Derived vs persisted: XP/level/streak/achievements/progress derived from session+quiz history (current posture) vs persisted profile records — pick per domain concept with rationale (migration, anti-farming, offline, export size).
- Store v2: new object stores? DB version bump + `onupgradeneeded` migration from v1. Versioned export schema (`schemaVersion: 2`) that migrates v1 imports.
- Duplicate-award protection and replay/refresh inflation prevention: where the idempotency boundary lives.
- Corruption handling, safe defaults, serialization validation, atomic-ish multi-store writes.
- The seam for future multi-user/cloud (e.g., all writes go through a profile-scoped repository interface) without building it now.
- Invariant list (§29) as testable statements.

## Deliverable

ADRs + interface sketches (`src/lib/events.js`, `src/lib/profile.js`, store v2 shape), migration plan (v1 → v2, including old exports), invariant test list. Feeds architect + planner.

## Constraints

- ADR-2/6; ADR-10 zero network; no PII; export/import is the user's ownership path.
- Existing users' data must survive the migration (or be safely rejected with a readable error).
- No dependency; IndexedDB only.

## Out of scope

- Cloud sync implementation, accounts, auth.
- UI for migrations beyond readable errors.

## Resolution

(pending)
