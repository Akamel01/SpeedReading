// Quiz-quality regression lock-in (M-F04, ADR-14).
// Original calibration passage written for this fixture (no provenance issues).
// Fixed seed + exact-output asserts: any generator change fails loudly until
// the diff is deliberately reviewed as a quality judgment.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuiz } from '../src/lib/quiz.js';

const EXCERPT =
  'Reading quickly takes steady practice and honest measurement every day. ' +
  'Comprehension matters more than raw speed for serious readers. ' +
  'Short daily sessions beat rare marathon sessions for lasting gains. ' +
  'A calm room helps focus more than loud music ever will. ' +
  'Track both speed and understanding after every single session. ' +
  'Review difficult passages slowly before attempting them at full pace. ' +
  'Rest between hard sessions lets new habits settle firmly. ' +
  'Celebrate small steady gains instead of chasing dramatic jumps. ' +
  'Preview chapter headings before starting any unfamiliar book. ' +
  'Ask what the author wants you to remember afterwards. ' +
  'Summarize each section in your own plain words. ' +
  'Notice when attention drifts and gently return. ' +
  'Vary chunk size only after baseline scores stabilize. ' +
  'Keep the same text for retests across weeks. ' +
  'Time each session with a simple clock nearby. ' +
  'Write one sentence about what improved today. ' +
  'Compare this week against last week fairly. ' +
  'End each week by rereading the hardest passage again.';

const EXPECTED_SEED_42 = [
  { sentence: 'A ____ room helps focus more than loud music ever will', id: 0, kind: 'cloze', answer: 'calm', accepted: ['calm'], candidates: ['room', 'helps', 'focus', 'more'] },
  { sentence: 'Short daily sessions beat ____ marathon sessions for lasting gains', id: 1, kind: 'cloze', answer: 'rare', accepted: ['rare'], candidates: ['short', 'daily', 'sessions', 'beat'] },
  { sentence: '____ what the author wants you to remember afterwards', id: 2, kind: 'cloze', answer: 'ask', accepted: ['ask'], candidates: ['what', 'author', 'wants', 'you'] },
  { sentence: 'Review difficult passages slowly before attempting them at ____ pace', id: 3, kind: 'cloze', answer: 'full', accepted: ['full'], candidates: ['review', 'difficult', 'passages', 'slowly'] },
  { sentence: 'Preview chapter headings before starting any unfamiliar ____', id: 4, kind: 'cloze', answer: 'book', accepted: ['book'], candidates: ['preview', 'chapter', 'headings', 'starting'] },
];

test('fixture excerpt is in the 150-250 word window', () => {
  const words = EXCERPT.split(/\s+/).filter(Boolean).length;
  assert.ok(words >= 150 && words <= 250, `excerpt has ${words} words`);
});

test('fixed seed produces the exact locked questions', () => {
  assert.deepEqual(generateQuiz(EXCERPT, { n: 5, seed: 42 }), EXPECTED_SEED_42);
});

test('no blanked answer is a stopword and every blank has same-text distractors', () => {
  // Mirrors the generator's stopword set in src/lib/quiz.js.
  const stopwords = new Set([
    'the', 'is', 'and', 'or', 'a', 'an', 'in', 'of', 'to', 'over', 'it', 'for', 'on',
    'with', 'that', 'this', 'these', 'those',
    'said', 'says', 'told', 'asked', 'replied', 'went', 'came', 'know', 'think', 'thought',
    'like', 'just', 'very', 'much', 'many', 'some', 'any', 'every', 'each', 'other',
    'another', 'same', 'such', 'only', 'also', 'then',
    'when', 'where', 'while', 'after', 'before', 'again', 'still', 'even', 'here', 'there',
    'now', 'back',
  ]);
  const quiz = generateQuiz(EXCERPT, { n: 5, seed: 42 });
  assert.equal(quiz.length, 5);
  for (const q of quiz) {
    assert.ok(!stopwords.has(q.answer.toLowerCase()), `stopword blanked: ${q.answer}`);
    assert.ok(Array.isArray(q.candidates) && q.candidates.length >= 1, 'needs distractors');
    assert.ok(q.accepted.includes(q.answer), 'accepted must include the answer');
    assert.match(q.sentence, /____/, 'sentence must show the blank');
  }
});

test('different seed yields a different quiz', () => {
  const a = generateQuiz(EXCERPT, { n: 5, seed: 42 });
  const b = generateQuiz(EXCERPT, { n: 5, seed: 7 });
  assert.notDeepEqual(a, b);
});
