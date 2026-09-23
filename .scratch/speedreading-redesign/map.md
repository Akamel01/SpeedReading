# Map — speedreading-redesign

Effort: redesign the trainer UI/UX through 3 skill passes, then architecture, then implementation tickets.
Upstream: shipped MVP (`Akamel01/SpeedReading` live). Related: `.scratch/speedreading-followups/`, `.scratch/speedreading-deploy-imports/`.

## Notes

- Pass order per run: frontend-design → apple-design → impeccable. Pass 1 diverges, pass 2 challenges with a different direction, pass 3 converges.
- Strictly linear chain: each ticket consumes the previous artifact and writes its own under `design/`.
- Ticket 10 runs improve-codebase-architecture (HTML report in OS tmp, grill, chosen deepening).
- Ticket 11 publishes the implementation plan as tickets with a dependency matrix.

## Resolution

All eleven plan tickets resolved (3 passes × 3 skills, architecture review with grill, implementation round).
Build tickets live in `.scratch/speedreading-redesign-build/` (frontier: B1, B2, B3).

## Ticket index

| # | Ticket | Category | Status | Blocked by |
|---|---|---|---|---|
| 01 | pass-1-frontend | enhancement | ready-for-agent | none |
| 02 | pass-1-apple | enhancement | ready-for-agent | 01 |
| 03 | pass-1-impeccable | enhancement | ready-for-agent | 02 |
| 04 | pass-2-frontend | enhancement | ready-for-agent | 03 |
| 05 | pass-2-apple | enhancement | ready-for-agent | 04 |
| 06 | pass-2-impeccable | enhancement | ready-for-agent | 05 |
| 07 | pass-3-frontend | enhancement | ready-for-agent | 06 |
| 08 | pass-3-apple | enhancement | ready-for-agent | 07 |
| 09 | pass-3-impeccable | enhancement | ready-for-agent | 08 |
| 10 | architecture-review | enhancement | ready-for-agent | 09 |
| 11 | publish-implementation-tickets | enhancement | ready-for-agent | 10 |
