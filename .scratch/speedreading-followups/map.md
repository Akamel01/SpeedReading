# Map — speedreading-mvp follow-ups

Effort: harden and extend the shipped MVP. Delivered run: `speedreading-001`, verdict GO.
Evidence: `.autoforge/state.json`, `.autoforge/validation/report.md` (GO, 5/5), `.autoforge/decisions/log.md` (#1–#21).

## Notes

- MVP is a local-first RSVP trainer: TXT/EPUB import, 1–3 word chunks with ORP anchor, baseline calibration, hidden-answer cloze quizzes, local progress dashboard. Unit suite 75/75; browser E2E 19/19.
- Frontier = all tickets below; every ticket is independent (no blocking edges), so agents can work them in any order.

## Decisions so far

- Tracker: local markdown (`.scratch/`); labels: defaults; domain docs: README glossary + `.autoforge/architecture/decisions.md` (see `docs/agents/`).
- Delivered slices are traced in `.autoforge/` (16 modules + 26 reviews), not duplicated as tickets — this map is the pointer.
- Scope decision per triage: quiz authoring (02) stays separate from assessment flow; chapter navigation (01) is the only structural UI addition.

## Fog

- Real screen-reader behavior unverified (06 will resolve or escalate).
- IDB quota failure unexercised (07 will resolve).
- 130k-word perf budget unknown (08 will resolve).

## Ticket index

| # | Ticket | Category | Status |
|---|---|---|---|
| 01 | chapter-picker | enhancement | ready-for-agent |
| 02 | quiz-authoring-mode | enhancement | ready-for-agent |
| 03 | wpm-active-time-unit | enhancement | ready-for-agent |
| 04 | quiz-regression-lockin | enhancement | ready-for-agent |
| 05 | export-import-e2e | enhancement | ready-for-agent |
| 06 | sr-keyboard-verification | enhancement | ready-for-human |
| 07 | idb-failure-hardening | enhancement | ready-for-agent |
| 08 | large-book-perf | enhancement | ready-for-agent |
| 09 | paste-text-import | enhancement | ready-for-agent |
| 10 | span-training-mode | enhancement | ready-for-agent |
