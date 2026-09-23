import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orpIndex, orpParts } from '../src/lib/orp.js';

function makeStr(len) {
  return 'x'.repeat(len);
}

// Helper to run a single test with a small wrapper
function t(desc, fn) {
  test(desc, fn);
}

// Lengths to validate: 1,2,5,6,9,10,13,14,20
const lengths = [1,2,5,6,9,10,13,14,20];

for (const L of lengths) {
  const s = makeStr(L);
  test(`orpIndex length ${L}`, () => {
    const idx = orpIndex(s);
    let expected;
    if (L === 1) expected = 0;
    else if (L >= 2 && L <= 5) expected = 1;
    else if (L >= 6 && L <= 9) expected = 2;
    else if (L >= 10 && L <= 13) expected = 3;
    else expected = 4;
    const maxIndex = Math.max(0, L - 1);
    if (expected > maxIndex) expected = maxIndex;
    assert.strictEqual(idx, expected);
  });

  test(`orpParts concatenation identity length ${L}`, () => {
    const parts = orpParts(s);
    const rebuilt = parts.left + parts.orp + parts.right;
    assert.strictEqual(rebuilt, s);
  });
}

test('TypeError cases for non-string and empty', () => {
  const bads = [null, undefined, 123, {}, ''];
  for (const b of bads) {
    assert.throws(() => orpIndex(b));
    assert.throws(() => orpParts(b));
  }
});
