# 22: HC-C human review closure

**What to do:** Close the HC-C human gate with recorded human verdicts: (a) screenshot eyeball review of `.autoforge/validation/screenshots/` (12 PNGs, 6 surfaces x 390/1280); (b) `docs/browser-checklist.md` manual matrix results; (c) screen-reader pass (ADR-16, tracked separately). Record verdicts in `.autoforge/validation/report-003.md` HC-C section, then flip M-P08B to closed.

**Blocked by:** 21 (Validation run — evidence complete, report-003 GO with 1 env exception).

**Status:** ready-for-human

**Plan module:** M-P08B (human half)

- [ ] Screenshots reviewed (note any visual defects or accept)
- [ ] Browser checklist matrix executed and recorded
- [ ] Screen-reader pass executed (or explicitly deferred with reason)
- [ ] Verdicts recorded in report-003.md; M-P08B closed in state.json
