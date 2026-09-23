# Pass 1 — Impeccable critique (Operate mode)

Status: critique verdicts → buildable spec deltas (no code). Next: pass-2 challenge (ticket 04).

Note: the skill's `scripts/context.mjs` and `reference/` playbooks are absent from the local install,
so this critique works from the skill's inline rules. Mode: **Operate** (task completion; scanability,
consistency, real usage scene outrank expression).

## Verdicts (keep / cut / replace)

### Keep

- **Marginalia rail** — the signature. Earns its place: progress-as-marginalia is subject-true and unowned by any template.
- **Highlighter ORP** — marker `#FFDD33` on the fixation character only. One memorable color job.
- **Tabular mono metrics** — WPM/% in `ui-monospace tabular-nums`. Correct register for data.
- **Practice-desk zones** (shelf / page / log) — structure encodes the workout flow; order carries real sequence info.

### Cut

- **Dashboard chart art** (already cut in apple pass) — numbers + ticks suffice; reaffirmed.
- **Translucent page card** — the RSVP page must be solid folio. A blurred page behind the fixation point risks legibility and buys nothing; translucency stays on the header only.
- **Suggestion auto-apply** — already explicit-accept; reaffirmed. No motion may ever imply acceptance.
- **Chapter picker UI in pass 1** — out of scope for the visual pass; structure must not assume it (chapter title line stays single-line, truncates).

### Replace

- **Settings row layout** (current: cramped inline selects) → grouped "Session setup" block above transport: Speed (WPM stepper), Text size, Chunk size, Calm mode (reduced-motion override). Reason: grouping/mapping — controls mirror what they change; current row reads as ereader clutter.
- **Empty shelf copy** → "Shelf is empty. Import a book to start training." with the import control adjacent (empty screen as invitation, control next to the invitation).
- **Quiz note wording** stays; **submit button** renamed "Check answers" (names what happens; "Save" describes the system).
- **Dashboard suggestion card** → "Next target: N wpm — Accept / Dismiss" (explicit dismiss; a suggestion without refusal is a nudge).

## Wayfinding check (where am I / go / out)

- Active nav state required (currently missing — header buttons have no active state). Fix in build.
- Every view keeps its `<h2>`; Esc exits player; quiz Cancel returns to dashboard. All present.
- Player needs a visible "exit" path besides Esc for pointer users — the Exit button stays, labeled "Exit".

## Copy deltas

- Buttons: Play/Pause, Check answers, Accept/Dismiss, Import, Fetch. No "Submit", no "OK".
- Errors keep current direct voice. Empty states invite action. No new claims (gate 5).

## Responsive

- Single column under ~900px: shelf → page → log; transport sticky under stage; margin rail collapses to a horizontal tick strip above the stage (ticks read left-to-right, same data).

## Buildable spec deltas for implementation tickets

1. Tokens + type table from pass-1-frontend/apple (frozen except pass-2/3 verdicts).
2. Session-setup block replaces settings row (structure + labels above).
3. Active nav state; Exit button kept.
4. "Check answers" + "Accept/Dismiss" renames.
5. Margin rail (desktop vertical, mobile horizontal strip) fed by session records.
6. Empty-shelf invitation layout.
