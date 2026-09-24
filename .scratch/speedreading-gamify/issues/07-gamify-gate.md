# 07: Gamification gate — a11y, motion, copy, verification

**Category:** enhancement

**What to build:** Cross-cutting verification gate for every gamification surface: accessibility, reduced motion, copy guardrails, and the run's final validation evidence.

**Blocked by:** 06.

**Status:** ready-for-agent

## Agent Brief

**Summary:** Extend existing harness scripts (verify actual paths: `scripts/a11y-checks.js`, `.autoforge/validation/e2e-walkthrough.mjs`). No feature work.

**Checks:**
- Keyboard: every gamification control (unlock-moment dismiss, any toggles/links) reachable and operable; focus visible.
- Screen reader attributes: badge names, progressbar values, calendar semantics, unlock announcement (`role="status"`, polite) — attributes only, never announcement quality (ADR-16).
- Contrast: computed pairs ≥4.5:1 for new text/background combinations (marker/iron, oxblood/folio, pencil/folio, stamp outlines).
- Reduced motion: `prefers-reduced-motion: reduce` disables transforms/count-ups (CDP emulation).
- Copy: grep `faster|boost|double|improve your speed|don't lose|lose your streak|streak at risk` over `src/ui/gamify-*.js` + `src/ui/dashboard.js` exits nonzero.
- Zero network after load re-verified.

**Acceptance criteria:**
- [ ] Extended harness passes headless Chromium (explicit command documented in the module report)
- [ ] Walkthrough green end-to-end; `node --test test/` green
- [ ] Findings recorded; any miss fixed or escalated with evidence (no silent pass)

**Out of scope:** human screen-reader pass (separate human gate, unchanged), performance work, release/push.
