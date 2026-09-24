import test from 'node:test';
import assert from 'node:assert/strict';
import { personalRecords, recordImprovements } from '../src/lib/records.js';

const at = (day, hour = 12) => new Date(2026, 8, day, hour).getTime();
const session = (over = {}) => ({
  id: over.id ?? 's',
  endedAt: over.endedAt ?? at(1),
  wordCount: 1000,
  elapsedMs: 600000,
  wpm: 300,
  comprehensionPct: 80,
  chunkSize: 2,
  textId: 'A',
  ...over,
});

test('personalRecords: all 10 ids present exactly once, empty input safe', () => {
  const records = personalRecords([], {});
  assert.equal(records.length, 10);
  assert.equal(new Set(records.map((r) => r.id)).size, 10);
  for (const r of records) {
    assert.equal(r.value, 0);
    assert.equal(r.at, null);
  }
  assert.deepEqual(
    records.map((r) => r.id).sort(),
    ['best-combined', 'best-comprehension', 'fastest-wpm', 'fastest-wpm-chunk-1', 'fastest-wpm-chunk-2', 'fastest-wpm-chunk-3', 'longest-session', 'longest-streak', 'most-sessions-day', 'most-words-day'],
  );
});

test('fastest-wpm: max among scored >=60%, drill excluded, ties resolve earliest', () => {
  const records = personalRecords([
    session({ id: 'a', wpm: 300, endedAt: at(1) }),
    session({ id: 'b', wpm: 400, endedAt: at(2) }),
    session({ id: 'c', wpm: 400, endedAt: at(3) }),
    session({ id: 'drill', wpm: 900, drill: 'span', endedAt: at(4) }),
    session({ id: 'low', wpm: 900, comprehensionPct: 40, endedAt: at(5) }),
  ], {});
  const fastest = records.find((r) => r.id === 'fastest-wpm');
  assert.equal(fastest.value, 400);
  assert.equal(fastest.sessionId, 'b');
  assert.equal(fastest.at, at(2));
  assert.equal(fastest.ties, 2);
});

test('best-comprehension and best-combined use scored sessions only', () => {
  const records = personalRecords([
    session({ id: 'a', wpm: 200, comprehensionPct: 90, endedAt: at(1) }),
    session({ id: 'b', wpm: 500, comprehensionPct: 60, endedAt: at(2) }),
    session({ id: 'drill', wpm: 999, comprehensionPct: 100, drill: 'span', endedAt: at(3) }),
  ], {});
  assert.equal(records.find((r) => r.id === 'best-comprehension').value, 90);
  assert.equal(records.find((r) => r.id === 'best-combined').value, 500 * 0.6);
});

test('longest-session includes drill sessions', () => {
  const records = personalRecords([
    session({ id: 'a', elapsedMs: 1000, endedAt: at(1) }),
    session({ id: 'drill', elapsedMs: 9999, drill: 'span', endedAt: at(2) }),
  ], {});
  assert.equal(records.find((r) => r.id === 'longest-session').value, 9999);
});

test('per-mode chunk records are split by chunkSize', () => {
  const records = personalRecords([
    session({ id: 'a', chunkSize: 1, wpm: 250, endedAt: at(1) }),
    session({ id: 'b', chunkSize: 2, wpm: 350, endedAt: at(2) }),
    session({ id: 'c', chunkSize: 3, wpm: 450, endedAt: at(3) }),
  ], {});
  assert.equal(records.find((r) => r.id === 'fastest-wpm-chunk-1').value, 250);
  assert.equal(records.find((r) => r.id === 'fastest-wpm-chunk-2').value, 350);
  assert.equal(records.find((r) => r.id === 'fastest-wpm-chunk-3').value, 450);
});

test('day records and longest streak derive from dayMap', () => {
  const dayMap = new Map([
    ['2026-09-01', { count: 1, words: 500 }],
    ['2026-09-02', { count: 2, words: 1500 }],
    ['2026-09-03', { count: 1, words: 700 }],
    ['2026-09-10', { count: 5, words: 3000 }],
  ]);
  const records = personalRecords([], { dayMap });
  assert.equal(records.find((r) => r.id === 'most-words-day').value, 3000);
  assert.equal(records.find((r) => r.id === 'most-words-day').day, '2026-09-10');
  assert.equal(records.find((r) => r.id === 'most-sessions-day').value, 5);
  assert.equal(records.find((r) => r.id === 'longest-streak').value, 3);
  assert.equal(records.find((r) => r.id === 'longest-streak').day, '2026-09-03');
});

test('recordImprovements: strict improvements only, chronological, previous recorded', () => {
  const events = recordImprovements([
    session({ id: 'a', wpm: 300, endedAt: at(1) }),
    session({ id: 'b', wpm: 250, endedAt: at(2) }),
    session({ id: 'c', wpm: 300, endedAt: at(3) }),
    session({ id: 'd', wpm: 420, endedAt: at(4) }),
  ], {});
  const wpm = events.filter((e) => e.id === 'fastest-wpm');
  assert.deepEqual(wpm.map((e) => [e.sessionId, e.value, e.previous]), [['a', 300, null], ['d', 420, 300]]);
  const sorted = events.slice().sort((x, y) => x.at - y.at);
  assert.deepEqual(events, sorted);
});

test('malformed input never throws', () => {
  assert.doesNotThrow(() => personalRecords(null, {}));
  assert.doesNotThrow(() => personalRecords([null, {}, 'x'], { dayMap: 'nope' }));
  assert.doesNotThrow(() => recordImprovements(undefined, { dayMap: { bad: null } }));
});
