# Pass 3 — Final buildable spec

Status: implementable without further design decisions. Next: architecture review (ticket 10).

## Screens

1. **Shelf (library)**: heading "Shelf"; empty invitation + import control adjacent; book rows (title, source, words, Open/Delete); paste box; URL box; export/import-data; rights notice.
2. **Page (player)**: chapter title; RSVP stage (grid anchor, serif 2rem, marker ORP underline); margin rail (desktop) / tick strip (mobile); transport (Prev, Play/Pause, Next, −/+, Exit); Session-setup block (Speed stepper, Text size, Chunk size, Calm mode); progress "Chunk i / n".
3. **Quiz**: heading "Check answers"; 5 cloze inputs (empty, placeholder "Your answer"); note "auto-generated from this text; answers are checked when you save"; Check answers / Cancel.
4. **Log (dashboard)**: heading "Progress"; summary line; lap rows ("Lap N · WPM · comp% · delta", best in marker, experimental badge on 3-word); suggestion "Next target: N wpm — Accept / Dismiss"; Export/Import; Start session.
5. **First-run**: empty shelf is the onboarding (invitation + import); no tutorial overlay (Purpose: nothing to teach that one workout doesn't teach).

## States

- Errors: direct voice, adjacent fix action. Empty: invitation + control. Loading: none needed (local ops); import shows progress text only for PDF/EPUB.
- Reduced motion: manual sentence mode unchanged; all transitions become ≤150ms cross-fades.

## Copy freeze

Start, Pause, Prev, Next, Exit, Check answers, Cancel, Accept, Dismiss, Import, Fetch, "Lap N", "Best N wpm". Shelf empty: "Shelf is empty. Import a book to start training."

## Craft floor (self-check)

No banned patterns: no stacked translucency, no text on marker, no naked deltas, no auto-apply, no chart art, no ambient animation, no numbered decorative markers, no new claims. Contrast: iron/folio 15:1, pencil/folio 4.6:1 (secondary only).

## Build deltas (for implementation tickets)

T1 tokens + type + materials CSS; T2 header/nav + active state + routing focus; T3 shelf restyle + empty invitation; T4 page restyle + session-setup block + renames; T5 margin rail/strip from session records; T6 quiz copy + Check answers; T7 log lap rows + Accept/Dismiss + deltas; T8 motion values + fallbacks; T9 responsive rules + tick strip; T10 full-suite green + e2e (final slice).
