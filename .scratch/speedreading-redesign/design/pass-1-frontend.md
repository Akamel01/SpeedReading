# Pass 1 — Frontend direction: "The Reading Atelier"

Status: direction proposal (no code). Next: apple motion/material layer (ticket 02).

## Brief (pinned)

- Subject: a personal reading gym — RSVP speed-reading trainer with honest progress.
- Audience: adult reader training alone, in short sessions.
- Page job: run a workout (import → read → quiz → log), not persuade or market.
- World to draw from: print craft, manuscripts, marginalia, highlighters, metronomes, practice logs.

## Tokens

### Color (named, exact)

| Token | Hex | Use |
|---|---|---|
| `--folio` | #F6F4EC | page background (warm paper, cool-neutral, not cream-beige) |
| `--iron` | #1A1815 | ink text, primary |
| `--marker` | #FFDD33 | highlighter accent: ORP character, active states, progress ticks only |
| `--pencil` | #82858A | marginalia gray: secondary text, captions, dividers |
| `--rule` | #E3DED2 | hairlines, card edges |
| `--oxblood` | #A93226 | destructive/errors only, never decoration |

Contrast: iron on folio ≈ 15:1; pencil on folio ≈ 4.6:1 (body-small minimum, never for essential controls); marker never carries text.

### Type (system stacks only — zero-network posture, no webfonts)

- Display: `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif` — titles, session numbers, chapter titles. Restrained: page titles + big WPM figures only.
- Body/UI: `system-ui, -apple-system, "Segoe UI", sans-serif` — controls, lists, instructions.
- Utility/data: `ui-monospace, "SF Mono", Menlo, monospace` with `tabular-nums` — WPM, percentages, timers, quiz scores.
- Scale: display clamp(1.75rem, 4vw, 2.75rem), tight leading 1.05, tracking -0.01em; body 1rem/1.5; captions 0.8125rem/1.4, tracking +0.01em.
- RSVP stage text: display serif at ~2rem, ORP character in marker with underline (keeps the trained fixation point unmistakable).

### Layout — "practice desk"

One-sentence concept: a desk with three zones — shelf (library, left), page (RSVP stage, center), log (progress, right) — collapsing to a single focused column under ~900px.

```
+------------------------------------------------------+
| SpeedReading                    Library Player Quiz  |
+----------+--------------------------------+----------+
| SHELF    | PAGE                         | LOG      |
| books    |  title                       | sessions |
| import   |  +------------------------+  | trend    |
| paste    |  | word word word       |  | suggest  |
| url      |  +------------------------+  | export   |
|          |  transport + settings      |          |
+----------+--------------------------------+----------+
```

Single column: shelf → page → log stacked; transport controls sticky under the stage.

### Signature + aesthetic risk

**The marginalia rail.** A vertical rule left of the RSVP stage where every completed session leaves a pencil tick annotated with its WPM; the margin visibly fills as training accumulates — progress as marginalia, not a chart. Risk taken: progress lives in the margin, not in a dashboard hero. Justification: it is the subject's own vernacular (readers mark margins), it rewards return visits, and it keeps the dashboard honest (numbers stay in the log, narrative stays in the margin).

## Motion (direction only; values in apple pass)

- Chunk transitions: none inside the stage (RSVP must not animate per-word — vestibular calm + timing integrity).
- One orchestrated moment: view changes cross-fade + rise 8px, 180ms, critically damped feel.
- Press feedback instant on pointer-down; progress ticks draw in on session save.

## Copy direction

Active voice, one job per element. Empty shelf: "Shelf is empty. Import a book to start training." Import failure: keep current direct wording. Quiz label stays "auto-generated from this text; answers are checked when you save". No new claims anywhere (grilling gate 5 holds).

## Anti-default check

- Cream + high-contrast serif + terracotta? Paper is warm-neutral, serif is system restraint (not display hero), accent is highlighter yellow (study vernacular, not terracotta). Pass.
- Near-black + acid accent? No dark mode in this direction. Pass.
- Broadsheet hairlines + dense columns? Hairlines yes (print craft), but single-column desk + margin rail, no newspaper grid. Pass.
- Generic numbered markers? None proposed. Pass.
