// Editable cloze quiz view.
// Contract: createQuizView(root, {onSave, onCancel}) -> {start(quiz)}
// quiz = {id?, textId?, createdAt?, seed?, questions: [{id, kind:'cloze', sentence, answer, accepted, candidates}]}

import { announce } from './a11y.js';

export function createQuizView(root, { onSave, onCancel } = {}) {
  let quiz = null;

  const heading = document.createElement('h2');
  heading.className = 'quiz-heading';
  heading.textContent = 'Comprehension check';

  const form = document.createElement('form');
  form.className = 'quiz-form';

  const list = document.createElement('ol');
  list.className = 'quiz-list';

  const status = document.createElement('p');
  status.className = 'quiz-status';

  const actions = document.createElement('div');
  actions.className = 'quiz-actions';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Save answers';
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  actions.append(saveBtn, cancelBtn);

  form.append(list, status, actions);
  root.replaceChildren(heading, form);

  function renderEmpty() {
    list.replaceChildren();
    const empty = document.createElement('li');
    empty.className = 'quiz-empty';
    empty.textContent = 'No quiz for this text yet.';
    list.appendChild(empty);
    saveBtn.hidden = true;
  }

  function start(nextQuiz) {
    quiz = nextQuiz;
    list.replaceChildren();
    status.textContent = '';
    saveBtn.hidden = false;
    if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      renderEmpty();
      return;
    }
    quiz.questions.forEach((question, position) => {
      const item = document.createElement('li');
      item.className = 'quiz-item';

      const label = document.createElement('label');
      label.className = 'quiz-question';
      label.textContent = `Q${position + 1}: ${question.sentence} `;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'quiz-answer';
      input.dataset.position = String(position);
      input.placeholder = 'Your answer';
      input.setAttribute('aria-label', `Answer for question ${position + 1}`);
      label.appendChild(input);
      item.appendChild(label);

      const note = document.createElement('p');
      note.className = 'quiz-note';
      note.textContent = 'auto-generated from this text; answers are checked when you save';
      item.appendChild(note);

      list.appendChild(item);
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!quiz || !Array.isArray(quiz.questions)) return;
    const inputs = [...form.querySelectorAll('input.quiz-answer')];
    // Assessment semantics: expected answers (accepted) stay untouched; inputs are the reader's answers.
    const answeredQuestions = quiz.questions.map((question, position) => ({
      ...question,
      userAnswer: inputs[position]?.value ?? '',
    }));
    status.textContent = 'Answers saved';
    announce('Quiz answers saved');
    onSave?.({ ...quiz, questions: answeredQuestions, edited: false });
  });

  cancelBtn.addEventListener('click', () => onCancel?.());

  return { start };
}
