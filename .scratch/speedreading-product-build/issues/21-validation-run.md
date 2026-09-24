# 21: Validation run

**What to build:** Run the full evidence set and write the honest validation report: unit suite, walkthrough (all states, resume double-count numeric assertion, reward-once, refresh and close/reopen, v1 and v2 import, console errors), all harnesses, perf, security, screenshots. Document honest limits (headless Chromium only, no pixel diff, no screen-reader-quality automation) and the v2 irreversibility note with export-before-update guidance. No push, no deploy.

**Blocked by:** 20 (Verification harness build).

**Status:** ready-for-agent

**Plan module:** M-P08B

- [ ] Unit suite green; walkthrough green including the numeric resume double-count assertion and reward-once
- [ ] All harness scripts exit 0; perf and security results recorded
- [ ] Report written with command outputs, coverage map, honest limits, and the v2 irreversibility note
- [ ] Human review recorded (HC-C) — closing criterion; no push

## Resolution

Evidence complete 2026-09-24 (M-P08B): report-003.md written (coverage map, honest limits, v2 irreversibility); README v2 note added. Awaiting HC-C human review; run ends at validation, no push.
