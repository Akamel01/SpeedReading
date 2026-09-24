# Map — speedreading-gamify

Effort: gamify the trainer UI with Trophy UI's gamification grammar, adapted to ADR-1 (no build/deps) and the folio design world.
Upstream: Trophy UI (https://github.com/trophyso/ui, MIT). Shipped app: https://akamel01.github.io/SpeedReading/. Prior runs: `.scratch/speedreading-redesign/`, `.scratch/speedreading-followups/`, `.scratch/speedreading-deploy-imports/`.

**Superseded 2026-09-23 by `.scratch/speedreading-product-build/` (approved ticket set; single frontier).** Mapping: gamify/01→build 03, 02→04, 03→05, 04→12, 05→13, 06→18, 07→19. This map is kept for history only; work from the build set.

## Notes

- Design direction decided first, frozen in `design/direction.md` (frontend-design + taste passes), before architecture/planning. Trophy → folio mapping table lives there.
- Trophy components are React/shadcn/Tailwind → not installable; grammar/states/data shapes adapted natively.
- Derived data only: XP/streak/achievements recompute from session history. Single persisted delta: `settings.seenAchievements`. No store version bump.
- Order: engines (01–03 parallel) → cards (04) → viz (05) → integration (06) → gate (07).
- No push/deploy in this run unless the human asks.

## Ticket index

| # | Ticket | Category | Status | Blocked by |
|---|---|---|---|---|
| 01 | xp-levels | enhancement | ready-for-agent | none |
| 02 | streak | enhancement | ready-for-agent | none |
| 03 | achievements | enhancement | ready-for-agent | none |
| 04 | gamify-cards | enhancement | ready-for-agent | 01, 02, 03, product/01 |
| 05 | gamify-viz | enhancement | ready-for-agent | 04 |
| 06 | integration | enhancement | ready-for-agent | 01, 02, 03, 04, 05 |
| 07 | gamify-gate | enhancement | ready-for-agent | 06 |
