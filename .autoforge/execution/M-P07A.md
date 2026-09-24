# M-P07A quiz-review — final report (orchestrator implemented, reviewed)

No worker dispatched (W4 app.js work is orchestrator-only). Existing view had answering + authoring but no review state and unreachable authoring.

- `src/ui/quiz-view.js`: startReview(quiz, result, {edited}) — score header, per-question Your answer/verdict(Correct/Not quite/Skipped)/Expected disclosure, Edit expected answers entry, Done → onDone; actions restored on start/startAuthoring; status text set synchronously (rAF deferral raced post-save rendering — fixed); answering branch verified CLEAN of .answer/.accepted refs.
- `src/app.js`: onSave splits answering (score + quiz put + THE session amend + review) vs authoring (quiz-only put, edited:true, re-scored display, session untouched); I3 single-amend guard (answered session re-renders review without rewrite); onDone (suggestion + dashboard).
- `styles/app.css` S4: token styles for verdicts/review borders/expected.
- Walkthrough: section 6 updated (submit → review → Done → dashboard); 9e (exclusion structural, verdicts, genuine-miss key check, authoring re-score 0/5→1/5, I3 byte-identical, edited:true, Done).

Self-repair: invalid word-level exclusion check (keys are text words — replaced with structural + genuine-miss checks); test-design fix (skipped Q1 can't match edited key — Q1 now answered wrong); rAF status race; duplicated Edit click.

- Review: APPROVED_WITH_NOTES; note (double-submit hardening) ADDRESSED with I3 guard.
- Evidence: walkthrough 80/1 (fixture only); `node --test` 177/177 (quiz 10/10); app.css custom props 0; innerHTML 0; banned copy 0.

## Quiz copy inventory (frozen)

Comprehension check · Check answers · Cancel · No quiz for this text yet. · Review: N/M (P%) · Expected answers edited after scoring — original answers kept. · Your answer: X / — · Correct · Not quite · Skipped · Expected: X · Edit expected answers · Done · Edit expected answers (heading) · Expected answer: / Also accepted (comma-separated): · Answers saved · Quiz edits saved · Quiz review: N of M correct (announcement)
