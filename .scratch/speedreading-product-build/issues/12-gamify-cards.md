# 12: Gamification cards

**What to build:** Gamification card components in the product's own visual language: XP card, streak card with day calendar, challenge card, achievement grid rendering glyphs, and the unlock moment (dismissible, announced, no focus theft). Accessible by construction, consuming tokens only.

**Blocked by:** 11 (Design system implementation), 03 (XP engine), 04 (Streak engine), 05 (Achievements engine), 06 (Challenges and personal records).

**Status:** ready-for-agent

**Plan module:** M-G04

- [ ] Harness asserts accessible names, progressbar values, calendar day labels, rarity, glyphs, unlock-once behaviour, dismissal without focus theft
- [ ] Reduced-motion branch verified; contrast pairs ≥4.5:1
- [ ] Copy guardrails clean (no speed promises, no guilt framing, no fake social comparison)
- [ ] No imports from the app or dashboard modules

## Resolution

Closed 2026-09-24 (W2). Review APPROVED. Evidence: 12/12 card checks in gamify.html; unit 176/176; copy grep clean; checkpoint-b/gamify-{390,1280}.png (re-shot after G05).
