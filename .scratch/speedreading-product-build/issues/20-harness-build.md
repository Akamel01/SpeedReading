# 20: Verification harness build

**What to build:** Complete the verification harness inventory: extend the existing harnesses, own the shared harness runner and the dashboard perf script, add security checks (no unsafe HTML APIs, URL policy, JSON shape probes), add the screenshot script (6 surfaces × 2 widths), and write the manual cross-browser checklist. No feature work.

**Blocked by:** 19 (Gamification verification gate).

**Status:** ready-for-agent

**Plan module:** M-P08A

- [ ] Every script runs with a documented command and exits 0
- [ ] Screenshots written for 6 surfaces at 390px and 1280px
- [ ] Security greps report zero findings; dashboard budget recorded
- [ ] `node --test` discovery unaffected (runners stay outside `test/`)

## Resolution

Closed 2026-09-24 (W5). Harness only, no feature work. Review APPROVED_WITH_NOTES (sink note addressed). Evidence: all scripts exit 0; 12 screenshots; unit 177/177.
