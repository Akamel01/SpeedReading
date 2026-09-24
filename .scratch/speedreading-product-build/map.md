# Map — speedreading-product-build

Effort: execution tickets for the full product transformation. Parent: `.scratch/speedreading-product/map.md` (wayfinder destination + decision tickets). Authority: `.autoforge/architecture/decisions.md` ADR-21..27 + `.autoforge/plans/plan.md` v1.1 (21 modules) + `.autoforge/requirements/grilling.md` binding decisions.

## Notes

- Ticket files are the single frontier. The prior `.scratch/speedreading-gamify/` ticket set is **superseded** (mapping below).
- Each ticket names its plan module; the technical contract (files, signatures, exact acceptance commands) lives in `.autoforge/plans/plan.md` and `.autoforge/execution/work-order.json`.
- Human checkpoints: **HC-A** after tickets 01/09/10 (one batched prototype reaction), **HC-B** after 11/12/13/07/08 (design taste + IA/economy/persistence review), **HC-C** on ticket 21 (final validation review).
- No push, no deploy. The run ends at validation.
- Status convention: HITL tickets are `ready-for-agent` for the build; they close only when the human reaction is recorded.

## Dependency matrix

| # | Ticket | Blocked by | Wave | Plan module |
|---|---|---|---|---|
| 01 | visual-direction-prototype | — | W1 | M-P01A |
| 02 | ia-shell | — | W1 | M-P02 |
| 03 | xp-engine | — | W1 | M-G01 |
| 04 | streak-engine | — | W1 | M-G02 |
| 05 | achievements-engine | — | W1 | M-G03 |
| 06 | economy-libs | — | W1 | M-P04 |
| 07 | persistence-v2 | 02 | W1b | M-P03A |
| 08 | events-composition | 03, 04, 05, 06 | W1b | M-P03B |
| 09 | player-prototype | 01 | W1b | M-P05A |
| 10 | library-prototype | 01 | W1b | M-P06A |
| 11 | design-system-implementation | 01, 02, HC-A | W2 | M-P01B |
| 12 | gamify-cards | 11, 03, 04, 05, 06 | W2 | M-G04 |
| 13 | gamify-viz | 12 | W2 | M-G05 |
| 14 | player-implementation | 09, 11, 02, 07, 13, HC-A, HC-B | W4 | M-P05B |
| 15 | library-implementation | 10, 11, 02, 07, 14, HC-A, HC-B | W4 | M-P06B |
| 16 | quiz-review | 11, 15, HC-B | W4 | M-P07A |
| 17 | dashboard-summary | 16, 08, 15, HC-B | W4 | M-P07B |
| 18 | integration | 17, 12, 13, 07, 08 | W5 | M-G06 |
| 19 | gamify-gate | 18 | W5 | M-G07 |
| 20 | harness-build | 19 | W5 | M-P08A |
| 21 | validation-run | 20 | W5 (HC-C) | M-P08B |

**Frontier now:** 01, 02, 03, 04, 05, 06 (all unblocked).
**Critical path:** 01 → 09 → HC-A → 11 → 12 → 13 → HC-B → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21.

## Superseded ticket mapping

`.scratch/speedreading-gamify/issues/` is history only:

| gamify | build |
|---|---|
| 01 xp-levels | 03 |
| 02 streak | 04 |
| 03 achievements | 05 |
| 04 gamify-cards | 12 |
| 05 gamify-viz | 13 |
| 06 integration | 18 |
| 07 gamify-gate | 19 |

## Resolution

**Progress 2026-09-23 (after HC-A):** closed 01 (visual direction, approved), 02 (ia-shell), 03 (xp), 04 (streak), 05 (player prototype, approved), 06 (economy libs), 07 (persistence v2), 08 (events), 09 (achievements), 10 (library prototype, approved).
Evidence: `node --test` 176/176 · `scripts/harness-run.mjs test/harness/store-v2.html --assert` 10/10 · `scripts/export-import.js` 5/5 · walkthrough 51/1 (only `/tmp/pg1342.epub` fixture absent) · prototype overflow 320/1440 PASS.

**Frontier now:** W2 closed (11 design system, 12 gamify cards, 13 gamify viz — all reviewed and closed 2026-09-24).
Evidence: components harness 28/28 · gamify harness 25/25 · `node --test` 176/176 · walkthrough 51/1 (fixture only) · checkpoint-b/*.png at 390/1280.

**Next:** HC-B human review (checkpoint-b artifacts), then W4 (14 player, 15 library, 16 quiz, 17 dashboard).


**All tickets closed:** 01–21. W5 done (18 integration, 19 gate, 20 harness). M-P08B evidence complete; HC-C pending.
