// Lightweight tests for lib/text.js using Node's built-in test runner
import assert from 'assert';
import { test } from 'node:test';
import { tokenize, chunk } from '../src/lib/text.js';

test('tokenize simple sentence without boundary', () => {
  const toks = tokenize('Hi!');
  assert.strictEqual(toks.length, 1);
  assert.strictEqual(toks[0].word, 'Hi');
  assert.ok(/!/.test(toks[0].trail));
});

test('chunk respects longWordChars boundary (word > 14)', () => {
  const long = 'ThisIsAnExceedinglyLongWordTest';
  const toks = tokenize(long + ' end');
  const ch = chunk(toks, { size: 2, longWordChars: 14 });
  assert.ok(ch.length >= 1);
  assert.strictEqual(ch[0].words[0].word.length > 14, true);
});

test('paragraph boundary prevents cross-boundary merging', () => {
  const text = 'Hello world.\n\nNext paragraph.';
  const toks = tokenize(text);
  const ch = chunk(toks, { size: 2, longWordChars: 14 });
  assert.strictEqual(ch[0].text.trim(), 'Hello world.');
  assert.ok(ch[1].text.includes('Next'));
});

test('default size 2 yields two-token chunks from simple text', () => {
  const text = 'One two three.';
  const toks = tokenize(text);
  const ch = chunk(toks, { size: 2, longWordChars: 14 });
  assert.ok(ch.length >= 1);
});

test('long word is isolated even mid-chunk (reviewer fix)', () => {
  const toks = tokenize('one abcdefghijklmno two');
  const ch = chunk(toks, { size: 2, longWordChars: 14 });
  const isolated = ch.find((c) => c.words.some((w) => w.word.length > 14));
  assert.ok(isolated, 'long word chunk must exist');
  assert.strictEqual(isolated.words.length, 1, 'long word must be alone in its chunk');
});

test('chunk rejects invalid sizes instead of looping (reviewer fix)', () => {
  const toks = tokenize('a b c');
  assert.throws(() => chunk(toks, { size: 0 }), RangeError);
  assert.throws(() => chunk(toks, { size: 2.5 }), RangeError);
  assert.throws(() => chunk(toks, { size: 4 }), RangeError);
});

test('indented blank line still counts as paragraph boundary (reviewer fix)', () => {
  const toks = tokenize('Alpha\n   \nbeta gamma delta');
  const ch = chunk(toks, { size: 3, longWordChars: 14 });
  assert.strictEqual(ch[0].words.length, 1, 'paragraph break must end the chunk');
  assert.strictEqual(ch[0].words[0].word, 'Alpha');
});

test('unicode words are not split (reviewer fix)', () => {
  const toks = tokenize('naïve café');
  assert.deepStrictEqual(toks.map((t) => t.word), ['naïve', 'café']);
});

test('leading blank lines produce no empty chunks (reviewer fix)', () => {
  const toks = tokenize('\n\nHi');
  const ch = chunk(toks, { size: 2 });
  assert.strictEqual(ch.length, 1);
  assert.strictEqual(ch[0].words[0].word, 'Hi');
});
