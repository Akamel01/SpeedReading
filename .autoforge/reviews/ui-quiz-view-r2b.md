# Review: quiz-view (re-review after harness + payload repair)

Date: 2026-09-22 · Reviewer: autoforge-reviewer (read-only) · Verdict: **APPROVED_WITH_NOTES**

Scope: targeted re-review of (a) harness mount target, (b) quiz-level `edited: true` payload, (c) regression sweep.

## Evidence

### 1. Harness mounts `#view-quiz` — PASS

```
$ grep -n "document.getElementById('view-quiz')" test/harness/quiz-view.html
12:      const root = document.getElementById('view-quiz');

$ grep -n "const root = document;" test/harness/quiz-view.html
(no match, exit 1)
```

`test/harness/quiz-view.html:8` defines `<div id="view-quiz" class="quiz-root"></div>`; line 12 mounts the view to that node. Prior `const root = document;` regression is gone.

### 2. Quiz-level `edited: true` in onSave — PASS

```
$ grep -n "edited: true" src/ui/quiz-view.js
95:    onSave?.({ ...quiz, questions: editedQuestions, edited: true });

$ node --check src/ui/quiz-view.js
SYNTAX OK
```

Serve check (`python3 -m http.server`):

```
quiz-view.html  -> 200
quiz-view.js    -> 200
```

Per-question `edited` (change-detection) remains at `src/ui/quiz-view.js:90`; quiz-level flag added at :95. Payload shape now satisfies the prior minor.

### 3. Regression sweep — PASS

```
$ grep -nE "id = |aria-live|datalist" src/ui/quiz-view.js
(no match, exit 1)
```

No element `id =` assignments, no `aria-live`, no `datalist` added. `aria-label` on the answer inputs (:67) is pre-existing and expected.

Consumer sweep: only reference outside the module is the harness (`test/harness/quiz-view.html:21`). No production consumer of `edited` yet — no integration regression surface.

## Findings

1. **Approved.** All three targeted repairs verified with direct command output; syntax and HTTP serving clean.
2. **Note (non-blocking):** quiz-level `edited: true` (:95) is unconditional — even an unchanged save reports `edited: true`. Fine for the stated prior finding, but if a future consumer uses it to gate persistence/dirty-state, change to `edited: editedQuestions.some(q => q.edited)` at that integration point.
3. **Note:** no automated test covers the payload; harness logs to console only. Add one assertion on the onSave payload if behavior is to be locked.

No blocking issues. No code modified during review.
