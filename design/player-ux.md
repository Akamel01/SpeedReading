# Player UX — interaction spec (M-P05A)

Authority: `design/direction.md` (tokens/values). Constraints preserved: ADR-5 timing engine, ADR-7 announcements at sentence boundaries only + dual presentation, ADR-8 chunk policy (1/2/3 words, 3 experimental), ADR-18 copy rules.

## Progressive disclosure

| Always visible (reading) | Behind "Session" panel | Never during reading |
|---|---|---|
| current chunk with ORP anchor | goal picker | XP/level detail |
| progress bar + % and words read | typography scale and alignment | achievements/streak grids |
| elapsed / remaining | mode switches | editor/quiz surfaces |
| Pause / Restart / Skip | chunk size (1, 2, experimental 3) | full-text view |
| speed −/+ with current WPM | preview width (drill) | navigation chrome (focus mode) |
| goal chip (compact) | reduced-motion override | |

Focus mode hides header/nav/HUD; the stage keeps only the chunk, progress, and transport.

## State × control

| State | Pause | Restart | Skip | Speed ± | Goal chip | Resume banner |
|---|---|---|---|---|---|---|
| ready (opened, not started) | Play (label swaps) | enabled | enabled | enabled | shown | hidden |
| active | Pause | enabled | enabled | enabled | live progress | hidden |
| paused (manual) | Resume | enabled | enabled | enabled | live | hidden |
| paused (tab hidden) | Resume (on return) | enabled | enabled | enabled | live | hidden |
| SR manual mode | Advances by sentence | enabled | next sentence | hidden (announced) | live (words) | hidden |
| completed | disabled | enabled | disabled | disabled | summary state | hidden |
| restored from snapshot | starts **paused** | enabled | enabled | enabled | live | dismissed |

## Modes

- **Focus**: chrome hidden; exits with F or Esc.
- **Screen-reader manual**: sentence-at-a-time with `aria-live="polite"`; no timers; SR panel visible.
- **Reduced motion**: auto-advance defaults off (with `prefers-reduced-motion: reduce`); transitions become opacity-only ≤150ms; no count-ups.
- **Typography**: font scale (0.9–1.6), alignment left/center; persists in settings.
- **Chunk size**: 1/2/3; 3 is labelled experimental (ADR-8); captured at session open.

## Session goals

Goal set before start from the Session panel: target WPM, target duration, or none. The chip shows live progress against the goal (wpm vs target; elapsed vs duration). Goal is advisory copy only — never a failure state, never guilt copy (ADR-18 extended).

## Interruption / restore (ADR-21/23)

Snapshot (`profile.activeSession`) is written on pause, tab hide, pagehide, beforeunload, and exit; cleared on session record.

```js
ActiveSession = { sessionId, textId, chapterIndex, chunkIndex, wpm, chunkSize, elapsedMs, startedAt, savedAt }
```

On boot with a snapshot: library shows the resume banner; Resume opens the player **paused** at `chunkIndex`, seeded with `elapsedMs`; Start over discards the snapshot. A restored session keeps the original `sessionId` so awards cannot double-count (I2).

## Transitions

| Event | Motion | Duration |
|---|---|---|
| view enter (player) | rise + fade | `--dur-view` 180ms |
| card/panel entrance | fade + 4px rise | `--dur-tick` 240ms |
| pause/resume | opacity swap of the transport label | `--dur-status` 150ms |
| speed change | value tick (no movement) | `--dur-status` 150ms |
| completion → quiz | view rise; summary moments ≤320ms, never blocking | `--dur-reward` |
| reward/stamp | stamp-press, reduced-motion → opacity only | `--dur-tick` |
| RSVP chunks | **none** (reading priority) | — |

## Rail fate

The session margin rail survives as a quiet secondary panel (ledger grid + stamps), hidden in focus mode. One tick per finished session; the current session is an in-progress marker. It never updates during active reading (no distraction).

## A11y rules

- Real buttons with labels; focus visible (2px oxblood, 2px offset).
- RSVP stage `aria-hidden`; announcements only at sentence boundaries; SR mode polite live region.
- Resume banner is `role="status"`; focus is not stolen.
- All controls ≥44px touch targets on coarse pointers; reading usable at 200% zoom.
