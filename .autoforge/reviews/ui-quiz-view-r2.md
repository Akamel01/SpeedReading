# Re-review — M13 `ui-quiz-view` (round 2)

Reviewer: autoforge-reviewer (independent, read-only on repo sources).
Date: 2026-09-22. Reviewed: `src/ui/quiz-view.js` (rev `cbda6516cf6c4b49e4f136782c66658fa806bda6438562545e9da8d98dd1e166`, 101 lines), `test/harness/quiz-view.html`, `src/ui/a11y.js`, `index.html`, `.autoforge/architecture/decisions.md` §4, `.autoforge/plans/plan.md:220`.
Method: static grep + `node --check` + local HTTP serve/curl + headless Chrome execution of the real module (probe pages in system temp, deleted after; no repo files written besides this artifact).

## Verdict

**CHANGES_REQUIRED**

All five prior module blockers are fixed in `src/ui/quiz-view.js` — verified statically **and** at runtime (save-by-position survives duplicate/odd ids; payload spreads quiz-level fields; no own live region; no invented ids/datalist). One single-line defect remains **in the harness**: it mounts the view on `document` instead of `#view-quiz`, which throws `HierarchyRequestError` in a real browser and leaves the M13 acceptance page blank. One small data-model divergence (`edited` nesting) also remains.

## Evidence

### 1. Syntax, serve, static audit (real output)

```
$ node --check src/ui/quiz-view.js && echo SYNTAX_OK
SYNTAX_OK
```

Serve 8090 (`python3 -m http.server 8090`), curl status:

```
test/harness/quiz-view.html -> 200 1144B
src/ui/quiz-view.js -> 200 3309B
src/ui/a11y.js -> 200 1066B
index.html -> 200 1889B
```

```
$ grep -nE 'id = |datalist|aria-live|setTimeout|setInterval|fetch\(|getElementById' src/ui/quiz-view.js
65:      input.dataset.position = String(position);
```

No `aria-live` (absent → prior blocker 1 fixed), no `id =`/`datalist` (absent → prior blocker 2 fixed), no timers/fetch/store. `import { announce } from './a11y.js';` (`:5`) and `announce('Quiz answers saved');` (`:94`); `index.html:23` owns `#live-region` with `aria-live="polite"` — single live-region rule respected.

### 2. Save payload built from input positions (prior blocker 3)

`src/ui/quiz-view.js:80-96`, verbatim:

```js
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!quiz || !Array.isArray(quiz.questions)) return;
  const inputs = [...form.querySelectorAll('input.quiz-answer')];
  const editedQuestions = quiz.questions.map((question, position) => {
    const value = inputs[position]?.value ?? '';
    return {
      ...question,
      answer: value,
      accepted: [value, ...(question.accepted ?? []).filter((a) => a !== value)],
      edited: value.trim() !== (question.answer ?? '').trim(),
    };
  });
  status.textContent = 'Answers saved';
  announce('Quiz answers saved');
  onSave?.({ ...quiz, questions: editedQuestions });
});
```

No `q.id` is interpolated anywhere into a selector. Live probe (headless Chrome, real module import) with ids `a"b\c`, `dup`, `dup`:

```
RESULT|inputs=3|aria0="Answer for question 1"|savedId=Q9 textId=T1 seed=42 quizEdited=undefined|q0=NEW0 edited0=true q1=first q2=NEW2 edited2=true|empty="No quiz for this text yet."|saveHidden=true|cancel2|END
```

Duplicate ids do not collapse (q1 stayed `first`, q2 got `NEW2`); the quote/backslash id causes no throw; quiz-level `id/textId/createdAt/seed` pass through (`savedId=Q9 textId=T1 seed=42`) → prior blockers 3 and 4 fixed.

### 3. Labels, empty state, isolation (prior blocker 5)

- Inputs: wrapper `<label class="quiz-question">` + `input.setAttribute('aria-label', \`Answer for question ${position + 1}\`)` (`:67`) — probe read back `"Answer for question 1"` from a live DOM.
- Empty/absent quiz: `renderEmpty()` (`:36-43`) sets visible text `'No quiz for this text yet.'`, hides submit (`saveBtn.hidden = true`), Cancel only; `start(null)` did not throw and Cancel fired (`empty="No quiz for this text yet."|saveHidden=true|cancel2`).
- No fetch/timers/store/`document.body`/`getElementById` in the view; factory adds no global nodes. `accepted: [value, ...]` is safe because `scoreQuiz` filters empty strings (`src/lib/quiz.js:131-132`).

## Findings

1. **BLOCKER (harness) — view mounted on `document`, throws in real browser.**
   `test/harness/quiz-view.html:12` is `const root = document;` although `:8` defines the intended mount `<div id="view-quiz" class="quiz-root"></div>`. `createQuizView(document, …)` reaches `root.append(heading, form)` (`quiz-view.js:34`) and throws. Proven in headless Chrome on a control probe: `P2|THROW HierarchyRequestError|END`; the actual harness dump contains `quiz-item` count 0. One-line fix: `const root = document.getElementById('view-quiz');`.
2. **MINOR — quiz-level `edited` unset.** Data model `decisions.md:140` puts `edited:boolean` on the `quizzes` record; live save shows `quizEdited=undefined`, while per-question `edited` booleans are set (`edited0=true`). Either set it at quiz level (e.g. `edited: editedQuestions.some((q) => q.edited)` alongside the spread) or record an explicit decision that per-question diffing supersedes §4.
3. **NOTE (data only)** — harness sample has 2 questions while plan acceptance (`plan.md:220`) says "quiz shows 5 cloze items". Pad the sample when the harness mount is fixed; the view itself renders whatever it receives.

## Required changes (precise)

1. Harness line 12 → `const root = document.getElementById('view-quiz');` (and optionally 5 sample questions); nothing else in the harness may change for this fix.
2. Decide `edited` ownership: set quiz-level `edited` on save per `decisions.md` §4, or amend the data model to document per-question `edited`.

Re-check after fix: headless-Chrome-AB/serve 8090 + open harness → 5 `.quiz-item`s render, submit logs `onSave` payload, Cancel logs `onCancel`.
