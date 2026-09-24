// Editable cloze quiz view: answering flow + review flow + authoring flow.
// Contract: createQuizView(root, {onSave, onCancel, onDone})
//   -> {start(quiz), startReview(quiz, result), startAuthoring(quiz)}
// quiz = {id?, textId?, chapterIndex?, createdAt?, seed?, questions: [{id, kind:'cloze', sentence, answer, accepted, candidates, userAnswer?}]}
// result = {correct, total, pct, perQuestion: boolean[]}
// review = {edited?: boolean} — authoring re-entry shows the edited keys with the answering-time score kept on screen.
//
// ADR-12: the answering path must NEVER read q.answer / q.accepted (no expected
// strings in the answering DOM before save). Review discloses expected answers only
// after submit. Authoring is the only surface that edits expected answers, and it
// sets edited:true on save. Neither path amends a completed session (app-owned).
// S4: built with the shared h() DOM helper; copy frozen per the pass-3 spec.

import { h } from './h.js';
import { announce } from './a11y.js';

export function createQuizView(root, { onSave, onCancel, onDone } = {}) {
  let quiz = null;
  let mode = 'answering';

  const heading = h('h2', { class: 'quiz-heading' }, 'Comprehension check');
  const list = h('ol', { class: 'quiz-list' });
  const status = h('p', { class: 'quiz-status' });
  const saveBtn = h('button', { type: 'submit' }, 'Check answers');
  const cancelBtn = h('button', {
    type: 'button',
    on: { click: () => onCancel?.() },
  }, 'Cancel');
  const actions = h('div', { class: 'quiz-actions' }, saveBtn, cancelBtn);
  const form = h('form', { class: 'quiz-form' }, list, status, actions);
  root.replaceChildren(heading, form);

  function renderEmpty() {
    list.replaceChildren(h('li', { class: 'quiz-empty' }, 'No quiz for this text yet.'));
    saveBtn.hidden = true;
  }

  function startReview(nextQuiz, result, opts = {}) {
    mode = 'review';
    quiz = nextQuiz;
    const total = result?.total ?? quiz.questions.length;
    const correct = result?.correct ?? 0;
    const pct = result?.pct ?? 0;
    heading.textContent = `Review: ${correct}/${total} (${pct}%)`;
    saveBtn.hidden = true;
    status.textContent = opts.edited === true ? 'Expected answers edited after scoring — original answers kept.' : '';
    const editBtn = h('button', {
      type: 'button',
      on: { click: () => startAuthoring(quiz) },
    }, 'Edit expected answers');
    const doneBtn = h('button', {
      type: 'button',
      on: { click: () => onDone?.() },
    }, 'Done');
    actions.replaceChildren(editBtn, doneBtn);
    if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      renderEmpty();
      return;
    }
    list.replaceChildren(...quiz.questions.map((question, position) => {
      const given = (question.userAnswer ?? '').trim();
      const verdict = given.length === 0 ? 'skipped' : (result?.perQuestion?.[position] ? 'correct' : 'incorrect');
      const verdictEl = h('p', { class: `quiz-verdict quiz-verdict-${verdict}` },
        verdict === 'correct' ? 'Correct' : verdict === 'incorrect' ? 'Not quite' : 'Skipped');
      const yours = h('p', { class: 'quiz-yours' }, `Your answer: ${given.length > 0 ? given : '—'}`);
      const key = h('p', { class: 'quiz-expected' }, `Expected: ${question.answer ?? ''}`);
      return h('li', { class: `quiz-item quiz-review-${verdict}` },
        h('p', { class: 'quiz-question' }, `Q${position + 1}: ${question.sentence}`),
        yours, verdictEl, key);
    }));
    announce(`Quiz review: ${correct} of ${total} correct`);
  }

  function start(nextQuiz) {
    mode = 'answering';
    quiz = nextQuiz;
    heading.textContent = 'Comprehension check';
    actions.replaceChildren(saveBtn, cancelBtn);
    saveBtn.textContent = 'Check answers';
    saveBtn.hidden = false;
    status.textContent = '';
    if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      renderEmpty();
      return;
    }
    list.replaceChildren(...quiz.questions.map((question, position) => {
      const input = h('input', {
        type: 'text',
        class: 'quiz-answer',
        placeholder: 'Your answer',
        'data-position': String(position),
        'aria-label': `Answer for question ${position + 1}`,
      });
      const label = h('label', { class: 'quiz-question' }, `Q${position + 1}: ${question.sentence} `, input);
      const note = h('p', { class: 'quiz-note' }, 'auto-generated from this text; answers are checked when you save');
      return h('li', { class: 'quiz-item' }, label, note);
    }));
  }

  function startAuthoring(nextQuiz) {
    mode = 'authoring';
    quiz = nextQuiz;
    heading.textContent = 'Edit expected answers';
    actions.replaceChildren(saveBtn, cancelBtn);
    saveBtn.textContent = 'Save edits';
    saveBtn.hidden = false;
    status.textContent = '';
    if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      renderEmpty();
      return;
    }
    list.replaceChildren(...quiz.questions.map((question, position) => {
      const sentence = h('p', { class: 'quiz-question' }, `Q${position + 1}: ${question.sentence}`);
      const answerInput = h('input', {
        type: 'text',
        class: 'authoring-answer',
        value: question.answer ?? '',
        'aria-label': `Expected answer for question ${position + 1}`,
      });
      const acceptedInput = h('input', {
        type: 'text',
        class: 'authoring-accepted',
        value: Array.isArray(question.accepted) ? question.accepted.join(', ') : '',
        'aria-label': `Accepted alternatives for question ${position + 1}`,
      });
      const answerLabel = h('label', { class: 'quiz-authoring-answer-label' }, 'Expected answer: ', answerInput);
      const acceptedLabel = h('label', { class: 'quiz-authoring-accepted-label' }, 'Also accepted (comma-separated): ', acceptedInput);
      return h('li', { class: 'quiz-item quiz-authoring-item' }, sentence, answerLabel, acceptedLabel);
    }));
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!quiz || !Array.isArray(quiz.questions)) return;
    if (mode === 'authoring') {
      const answerInputs = [...form.querySelectorAll('input.authoring-answer')];
      const acceptedInputs = [...form.querySelectorAll('input.authoring-accepted')];
      const editedQuestions = quiz.questions.map((question, position) => ({
        ...question,
        answer: answerInputs[position]?.value ?? '',
        accepted: (acceptedInputs[position]?.value ?? '')
          .split(',')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
        edited: true,
      }));
      status.textContent = 'Edits saved';
      status.style.opacity = '0';
      requestAnimationFrame(() => { status.style.opacity = '1'; });
      announce('Quiz edits saved');
      onSave?.({ ...quiz, questions: editedQuestions, edited: true });
      return;
    }
    const inputs = [...form.querySelectorAll('input.quiz-answer')];
    const answeredQuestions = quiz.questions.map((question, position) => ({
      ...question,
      userAnswer: inputs[position]?.value ?? '',
    }));
    status.textContent = 'Answers saved';
    status.style.opacity = '0';
    requestAnimationFrame(() => { status.style.opacity = '1'; });
    announce('Quiz answers saved');
    onSave?.({ ...quiz, questions: answeredQuestions, edited: false });
  });

  return { start, startReview, startAuthoring };
}
