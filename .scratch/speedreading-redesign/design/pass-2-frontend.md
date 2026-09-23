# Pass 2 — Frontend direction: "The Stopwatch" (challenge to pass 1)

Status: alternative direction (no code). Next: apple layer (ticket 05).

## How it differs from pass 1 (required)

| Axis | Pass 1 (Atelier) | Pass 2 (Stopwatch) |
|---|---|---|
| Metaphor | print craft, marginalia | training instrument, lap timer |
| Palette family | warm paper + highlighter | cool gray + signal orange |
| Type roles | serif display + sans UI | grotesk display + serif reading text |
| Layout | 3-zone desk | single-column instrument stack |
| Signature | marginalia rail (margin fills) | lap strip (sessions as laps) |
| Progress story | accumulation in the margin | splits against the clock |

## Tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `--dial` | #ECEEF1 | cool instrument face background |
| `--ink` | #14181D | text, primary |
| `--signal` | #FF4D00 | signal orange: live state only (playing indicator, current lap, ORP) |
| `--slate` | #5B6470 | secondary text, captions |
| `--hair` | #D7DBE0 | hairlines, dividers |
| `--oxblood` | #A93226 | destructive/errors only (shared with pass 1) |

Contrast: ink on dial ≈ 14:1; slate on dial ≈ 5.2:1; signal never carries text.

### Type (system stacks, zero-network)

- Display: `system-ui, "Helvetica Neue", Arial, sans-serif` at 800, tight — stopwatch numerals, view titles, WPM readout. Character comes from weight + tabular figures, not a serif.
- Reading text: `Georgia, "Iowan Old Style", serif` — the RSVP stage and article/quotes. Serif where the reading happens.
- Utility/data: `ui-monospace, Menlo, monospace` tabular-nums — splits, deltas (+12 wpm in signal for gains, slate for losses).
- Scale: readout clamp(2.5rem, 7vw, 4rem)/1.0/tracking -0.02em; titles 1.5rem/1.1/-0.01em; body 1rem/1.55.

### Layout — "instrument stack"

Single column, max-width 46rem, top readout bar always visible during a session:

```
+------------------------------------------+
| 312 wpm      chunk 42/88        ● LIVE  |
+------------------------------------------+
| chapter title                            |
| +--------------------------------------+ |
| |          word word word              | |
| +--------------------------------------+ |
| [Prev] [Pause] [Next]  [-] [+] [Exit]  |
+------------------------------------------+
| LAPS                                     |
| #12  312 wpm  100%  +8                   |
| #11  304 wpm   80%  +2                   |
+------------------------------------------+
```

Library/quiz/dashboard keep the same stack with the readout replaced by view title. No side rails at any width (deliberate break from pass 1).

### Signature + aesthetic risk

**The lap strip.** Every session is a lap: number, WPM, comprehension, delta vs previous, signal dot on the current/best lap. Risk: a numeric-forward aesthetic for a reading app can feed WPM obsession against the comprehension-first honesty rule. Justification offered: laps make trends undeniable and deltas (+8) reward return visits; the risk is contained by always pairing WPM with comprehension on the same line (never a naked number).

## Motion (direction only)

- Digit changes swap instantly (no rolling digits — tabular stability aids reading).
- Lap rows enter with the same 180ms rise; the LIVE dot pulses at 1Hz via opacity only (disabled under reduced motion).
- Chunk transitions: none (same constraint as pass 1).

## Copy direction

Instrument register, terse: "Start", "Pause", "Lap 12", "Best 340". Empty shelf: "No books on the bench. Import one to start the clock." Errors identical in voice to pass 1.

## Anti-default check

- Cream/terracotta? No — cool gray + signal orange. Pass.
- Near-black + acid? No dark surfaces. Pass (signal orange on light ≠ vermilion-on-black default).
- Broadsheet? Single column, no rules grid. Pass.
- Numbered markers? Lap numbers ARE a sequence (sessions in time) — order carries information. Allowed with justification.

## Where it beats / loses vs pass 1

- Beats: trend legibility (deltas on every row), single-column focus on small screens, stronger "training" framing for retention.
- Loses: warmth and subject-truth (stopwatches are about speed, not comprehension); numeric forwardness risks the honesty posture; margin rail is more memorable and ownable.
