# 24: Review-notes cosmetic cleanup

**What to fix:** Non-blocking notes accepted across run-003 independent reviews (all APPROVED or APPROVED_WITH_NOTES; none block function):
1. `.btn` lacks `:hover`/`:active` (only element-level `button:hover/active` + `.btn:disabled` exist) — add token-based states.
2. `components.html` missing `rarity-uncommon/unlocked` stamp variants — add to the harness gallery.
3. Pre-existing undefined `--text-align`/`--font-scale` (set inline by player-view, never declared) — declare in `tokens.css` `:root`.
4. Max-level XP text renders an empty level name (`lvl.name` when no next level) — fall back to current level name.
5. Unused `today` variable in gamify-cards streakCard — remove or use.

**Blocked by:** none (cosmetic; app.css/token discipline holds: values from direction.md, zero custom properties in app.css).

**Status:** ready-for-agent

**Plan module:** none (post-run polish; each fix re-verified by components harness + unit)

- [ ] All five items fixed, values token-only
- [ ] `node scripts/harness-run.mjs test/harness/components.html --assert` green
- [ ] `node --test` green, walkthrough tail unchanged (99/1 fixture-only)

## Resolution

Closed 2026-09-24. All five fixed, token-only: `.btn:hover/:active` brightness states; stamp uncommon/unlocked variants in the components gallery (31 checks); `--font-scale`/`--text-align` declared in tokens `:root`; max-level XP text falls back to current level name; unused `today` removed (also fixed the max-level progressbar label). Evidence: components harness green; unit 177/177; walkthrough 100/100.
