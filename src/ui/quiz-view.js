// Editable cloze quiz view: answering flow + authoring flow.
// Contract: createQuizView(root, {onSave, onCancel}) -> {start(quiz), startAuthoring(quiz)}
// quiz = {id?, textId?, chapterIndex?, createdAt?, seed?, questions: [{id, kind:'cloze', sentence, answer, accepted, candidates}]}
//
// ADR-12: the answering path must NEVER read q.answer / q.accepted (no expected
// strings in the answering DOM before save). Authoring is the only surface that
// shows and edits expected answers, and it sets edited:true on save.
// S4: built with the shared h() DOM helper; copy frozen per the pass-3 spec.

import { h } from './h.js';
import { announce } from './a11y.js';

export function createQuizView(root, { onSave, onCancel } = {}) {
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

  function start(nextQuiz) {
    mode = 'answering';
    quiz = nextQuiz;
    heading.textContent = 'Comprehension check';
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
      status.style.opacity = '0';
      requestAnimationFrame(() => { status.textContent = 'Edits saved'; status.style.opacity = '1'; });
      announce('Quiz edits saved');
      onSave?.({ ...quiz, questions: editedQuestions, edited: true });
      return;
    }
    const inputs = [...form.querySelectorAll('input.quiz-answer')];
    const answeredQuestions = quiz.questions.map((question, position) => ({
      ...question,
      userAnswer: inputs[position]?.value ?? '',
    }));
    status.style.opacity = '0';
    requestAnimationFrame(() => { status.textContent = 'Answers saved'; status.style.opacity = '1'; });
    announce('Quiz answers saved');
    onSave?.({ ...quiz, questions: answeredQuestions, edited: false });
  });

  return { start, startAuthoring };
}
