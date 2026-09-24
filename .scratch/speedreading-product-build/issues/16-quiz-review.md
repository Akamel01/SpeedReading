# 16: Quiz review

**What to build:** Quiz review state: after submitting, per-question correct/incorrect/skipped with the score and an edit-expected-answers path that never amends the completed session. The answering/authoring separation is preserved.

**Blocked by:** 11 (Design system implementation), 15 (Library implementation), HC-B.

**Status:** ready-for-agent

**Plan module:** M-P07A

- [ ] Walkthrough: submit → review (correct/incorrect/skipped + score) → authoring edits persist with the edited flag without amending the completed session
- [ ] Copy inventory present (quiz surfaces)
- [ ] Quiz unit and regression tests green; the answering-exclusion grep is clean

## Resolution

Closed 2026-09-24 (W4). Orchestrator implemented directly. Review APPROVED_WITH_NOTES (hardening note addressed with I3 single-amend guard). Evidence: walkthrough 80/1 (fixture only); unit 177/177; copy inventory in module report.
