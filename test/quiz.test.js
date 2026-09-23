import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuiz, scoreQuiz, normalizeAnswer } from '../src/lib/quiz.js';

const LONG_TEXT = [
  'Reading quickly requires practice and attention every single day.',
  'Comprehension matters more than raw speed for any serious reader.',
  'Chunking words together changes how the eyes move across text.',
  'Regular calibration sessions reveal genuine progress over weeks.',
  'Retention quizzes keep the training honest and measurable always.',
].join(' ');

test('same seed produces identical quizzes', () => {
  const a = generateQuiz(LONG_TEXT, { n: 5, seed: 42 });
  const b = generateQuiz(LONG_TEXT, { n: 5, seed: 42 });
  assert.deepEqual(a, b);
});

test('different seeds produce different quizzes', () => {
  const a = generateQuiz(LONG_TEXT, { n: 5, seed: 1 });
  const b = generateQuiz(LONG_TEXT, { n: 5, seed: 99 });
  assert.notDeepEqual(a, b);
});

test('generateQuiz returns n=5 cloze questions with blanked answers', () => {
  const quiz = generateQuiz(LONG_TEXT, { n: 5, seed: 7 });
  assert.equal(quiz.length, 5);
  for (const q of quiz) {
    assert.equal(q.kind, 'cloze');
    assert.match(q.sentence, /____/);
    assert.ok(q.answer.length > 0);
    assert.ok(q.accepted.includes(q.answer));
    assert.ok(Array.isArray(q.candidates));
  }
});

test('normalizeAnswer handles case, punctuation, whitespace', () => {
  assert.equal(normalizeAnswer('  Hello, World!  '), 'hello, world');
  assert.equal(normalizeAnswer('“Speed.”'), 'speed');
  assert.equal(normalizeAnswer('  a\t b '), 'a b');
  assert.equal(normalizeAnswer(null), '');
});

test('scoreQuiz scores with tolerance and returns perQuestion', () => {
  const questions = [
    { answer: 'practice' },
    { answer: 'Comprehension' },
    { answer: 'honest' },
  ];
  const result = scoreQuiz(questions, ['  Practice! ', 'comprehension', 'wrong']);
  assert.deepEqual(result.perQuestion, [true, true, false]);
  assert.equal(result.correct, 2);
  assert.equal(result.total, 3);
  assert.equal(result.pct, 67);
});

test('scoreQuiz with zero questions yields pct 0 (not NaN)', () => {
  const result = scoreQuiz([], []);
  assert.deepEqual(result, { correct: 0, total: 0, pct: 0, perQuestion: [] });
  assert.ok(!Number.isNaN(result.pct));
});
