# Review — M13 `ui-quiz-view`

Reviewer: autoforge-reviewer (independent; worker report not trusted).
Date: 2026-09-22. Read-only review; no source edits.
Files reviewed: `src/ui/quiz-view.js`, `test/harness/quiz-view.html`, `src/lib/quiz.js` (Question shape), `src/ui/a11y.js`, `index.html`, `plan.md` §1a/§1b/M13, `decisions.md` ADR-4 + §4.

## Verdict

**CHANGES_REQUIRED**

Core acceptance behaves as specified (cloze items editable, pre-filled; Save emits
edited answers; Cancel wired; empty/absent quiz renders an empty state with no
error), and the file is syntactically clean with no fetch/store/timer usage.
But the view violates two pinned plan-§1b rules (single shared live region,
classes-not-ids), the save path is unsafe for duplicate/odd `q.id`, and the
`onSave` payload drops quiz-level fields that ADR-4/§4 assign to the quiz record.
Required changes are listed at the end.

## Evidence

### 1. Syntax, serving, static audit

`node --check src/ui/quiz-view.js` → exit 0, no output.

Static server on 8093 (`python3 -m http.server 8093`):

```
test/harness/quiz-view.html -> 200 1144B
src/ui/quiz-view.js -> 200 4637B
index.html -> 200 1889B
```

`grep -nE "fetch\(|setTimeout|setInterval" src/ui/quiz-view.js` → no matches
(exit 1). No imports at all (`grep -n "import"` finds only comments at
`quiz-view.js:7,135`), so `a11y.js` is never used.

Accepted behaviors:

- Input pre-fill, `quiz-view.js:53`: `input.value = (q.answer != null) ? String(q.answer) : '';`
- Label, `quiz-view.js:63`: `label.textContent = 'auto-generated, edit before use';`
- Cancel wiring, `quiz-view.js:119`: `cancelBtn.addEventListener('click', () => onCancel && onCancel());`
- Empty/absent quiz, `quiz-view.js:38-41` → `renderEmpty()` (Cancel only, no throw);
  `start(undefined)` reaches it via `!quiz`.
- No new fetch/store/timer; no `document` access at import time (factory only).

### 2. `onSave` payload construction (verbatim, `quiz-view.js:97-113`)

```js
saveBtn.addEventListener('click', () => {
  const newQuiz = { questions: [] };
  // Rebuild quiz from inputs
  quiz.questions.forEach((q) => {
    const el = container.querySelector(`input[data-qid="${q.id}"]`);
    const val = el ? el.value : q.answer;
    newQuiz.questions.push({
      id: q.id,
      kind: q.kind,
      sentence: q.sentence,
      answer: val,
      accepted: q.accepted,
      candidates: q.candidates,
    });
  });
  if (onSave) onSave(newQuiz);
  setStatus('Answers saved');
});
```

Question-level fields required by the contract (`id/kind/sentence/accepted/
candidates` + edited `answer`) are present. Quiz-level fields are not: the
emitted object is `{questions:[...]}` only, so `id`, `textId`, `createdAt`,
`seed` (ADR-4: "deterministic via a seeded PRNG (seed stored on the quiz)";
§4 quizzes record) are dropped, and `edited:true` (§4) is never set by anyone.
The app consumer must re-merge or data is lost.

### 3. Harness

`test/harness/quiz-view.html:10` imports the real module:
`import { createQuizView } from '../../src/ui/quiz-view.js';`
Sample has 2 cloze questions (`:23-41`) and `view.start(sample)` at `:44`.
Harness can only log callbacks (no assertions), which is acceptable for a
manual harness; note the plan M13 acceptance says "quiz shows 5 cloze items"
while this sample supplies 2 (data, not code — the view renders whatever
`start()` receives).

### 4. Adversarial

- **Empty answer**: `generateQuiz` itself can emit `answer:''` (`src/lib/quiz.js:79`);
  prefill becomes `''`, Save emits `answer:''`, `scoreQuiz` treats it as
  incorrect. No crash. OK.
- **0 questions / absent quiz**: `quiz-view.js:38-41` → `renderEmpty()`: a
  `.quiz-empty-msg` div with **no text** (`:24-26`) plus Cancel. No error, but
  the user gets a blank screen with one button; the message node is pointless.
- **HTML-like content**: safe. Sentence is split (`:49`) and inserted with
  `document.createTextNode` (`:50,57`); accepted via `acc.textContent` (`:70`);
  candidates via `optEl.value` (`:79-80`). No `innerHTML` of untrusted data
  (only `container.innerHTML = ''` clears the owned subtree).
- **Duplicate ids**: broken. `container.querySelector(\`input[data-qid="${q.id}"]\`)`
  (`:101`) returns the **first** matching input, so two questions with the same
  `id` both save with the first input's value — the second user edit is silently
  lost. An `id` containing `"` or `\` makes the interpolated selector invalid and
  `querySelector` throws, aborting save. (Generated ids are sequential integers,
  but the view is a public interface that accepts any quiz.)

## Findings

1. **FAIL — own live region, violates §1b and view-subtree ownership.**
   `quiz-view.js:8-15` builds a private `aria-live` node with inline styles and
   appends it to `document.body` at factory time. §1b: `#live-region` is the
   single `aria-live="polite"` node, owned by `a11y.announce`; `index.html:23`
   already provides it; the ownership rule confines a view to its own `#view-*`
   subtree. The node also leaks one per `createQuizView()` call and the module
   never imports `app`'s announce helper (`src/ui/a11y.js:14`).
2. **FAIL — creates new ids.** `quiz-view.js:77` sets `datalist.id = \`cand-${q.id}\``.
   §1b: views "may add classes (not ids)". Duplicate `q.id` produces duplicate
   DOM ids (invalid document; `list=` association resolves unpredictably). The
   candidates rendering is not required by the §1a contract at all.
3. **FAIL — save mapping not identity-safe.** `quiz-view.js:101` selector
   interpolation: duplicate ids silently collapse answers to the first input;
   ids containing `"`/`\` throw `SyntaxError` mid-save. Bind inputs at render
   time (Map/array keyed by question index) instead of re-querying by id.
4. **FAIL — `onSave` drops quiz-level fields.** `quiz-view.js:98` creates
   `{questions: []}` and never spreads the incoming quiz, losing
   `id/textId/createdAt/seed`; `edited` (§4) has no owner. Emit
   `{...quiz, questions: built, edited: true}`.
5. **NOTE — a11y/UX gaps (gate-4 relevant).** Inputs have no accessible name
   (`quiz-view.js:51-55`: only `type/value/dataset/class`; `accepted` and
   candidates carry none either), so SR users hear unlabeled edit fields; the
   empty state has no message text (`:25-26`); harness sample is 2 questions vs
   plan's "5 cloze items". Fix input labeling before app integration.

## Required changes (precise)

1. Delete the bespoke status region (`:7-19`); import and call
   `announce()` from `./a11y.js` for "Answers saved" and empty state; leave
   `#live-region` ownership to the shell.
2. Remove `datalist.id`/`list` wiring or render candidates with classes/text
   only. No new ids anywhere in the view subtree.
3. Build inputs into a render-time collection (or use `container.querySelectorAll('.quiz-blank')`
   in document order) and read values from it on save; never interpolate `q.id`
   into a selector.
4. Spread the source quiz on save and set `edited: true` (§4).
5. Add an accessible name to each input (e.g., `aria-label` referencing the
   question sentence/index) and put a short message in the empty state.

Re-review after fixes: rerun `node --check`, serve 8093 + curl the harness,
static grep, and re-walk the duplicate-id / odd-id adversarial cases.
