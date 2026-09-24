import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sessionXp, sessionsXp, streakXp, bonusXp, totalXp, levelFor, LEVELS,
} from '../src/lib/xp.js';

const scored = (over = {}) => ({
  wordCount: 1000,
  startedAt: Date.UTC(2026, 8, 23, 12),
  textId: 'A',
  comprehensionPct: 75,
  wpm: 300,
  targetWpm: 300,
  ...over,
});

test('LEVELS: 11 book-format tiers with exact thresholds', () => {
  assert.equal(LEVELS.length, 11);
  assert.deepEqual(LEVELS.map((l) => l.name), [
    'Leaflet', 'Pamphlet', 'Chapbook', 'Novella', 'Paperback',
    'Hardcover', 'Tome', 'Codex', 'Compendium', 'Scriptorium', 'Library',
  ]);
  assert.deepEqual(LEVELS.map((l) => l.threshold), [0, 100, 300, 700, 1500, 3000, 6000, 12000, 24000, 48000, 96000]);
});

test('empty and malformed input -> 0, never throws', () => {
  assert.equal(totalXp([]), 0);
  assert.equal(sessionXp(null), 0);
  assert.equal(sessionXp({}), 0);
  assert.equal(sessionXp({ wordCount: NaN }), 0);
  assert.equal(sessionsXp(null), 0);
  assert.equal(streakXp(null), 0);
  assert.equal(bonusXp(), 0);
  assert.equal(levelFor(NaN).index, 0);
});

test('worked example: 1000w / 75% / target met -> 125 XP', () => {
  assert.equal(sessionXp(scored()), 125);
});

test('worked example: same-text second session that day -> 75 XP', () => {
  assert.equal(sessionXp(scored(), { repeatIndex: 1 }), 75);
});

test('comprehension bands: <60 no bonus, >=60 +10, >=80 +20', () => {
  assert.equal(sessionXp(scored({ comprehensionPct: 40, wpm: 0, targetWpm: 300 })), 100);
  assert.equal(sessionXp(scored({ comprehensionPct: 60, wpm: 0, targetWpm: 300 })), 110);
  assert.equal(sessionXp(scored({ comprehensionPct: 80, wpm: 0, targetWpm: 300 })), 120);
});

test('target bonus requires comprehension >= 60', () => {
  assert.equal(sessionXp(scored({ comprehensionPct: 50, wpm: 400, targetWpm: 300 })), 100);
  assert.equal(sessionXp(scored({ comprehensionPct: 60, wpm: 300, targetWpm: 300 })), 125);
});

test('drill: half-rate words + recognition capped at 20', () => {
  assert.equal(sessionXp({ wordCount: 1000, drill: 'span', correct: 3 }), 53);
  assert.equal(sessionXp({ wordCount: 1000, drill: 'span', correct: 99 }), 70);
});

test('daily cap 500 applies per local day across sessions', () => {
  const day = Date.UTC(2026, 8, 23, 12);
  const many = Array.from({ length: 8 }, (_, i) => scored({ startedAt: day + i * 60000, wordCount: 2000, textId: `T${i}` }));
  assert.equal(sessionsXp(many), 500);
  const twoDays = [
    ...many,
    scored({ startedAt: day + 86400000, wordCount: 2000, textId: 'next' }),
  ];
  assert.equal(sessionsXp(twoDays), 500 + 200 + 10 + 15);
});

test('same-text same-day repeats halve the words term only', () => {
  const day = Date.UTC(2026, 8, 23, 12);
  const list = [
    scored({ startedAt: day, textId: 'A' }),
    scored({ startedAt: day + 60000, textId: 'A' }),
  ];
  assert.equal(sessionsXp(list), 125 + 75);
});

test('streakXp: +10 per extra day, +50 per complete 7-day block', () => {
  const days = (n, start = Date.UTC(2026, 8, 1)) => new Map(
    Array.from({ length: n }, (_, i) => {
      const d = new Date(start + i * 86400000);
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return [`${d.getUTCFullYear()}-${mm}-${dd}`, { count: 1, words: 100 }];
    }),
  );
  assert.equal(streakXp(days(1)), 0);
  assert.equal(streakXp(days(2)), 10);
  assert.equal(streakXp(days(3)), 20);
  assert.equal(streakXp(days(7)), 60 + 50);
  assert.equal(streakXp(days(8)), 70 + 50);
  const split = new Map([...days(3), ...[...days(3, Date.UTC(2026, 8, 10))].map(([k, v]) => [`${k}`, v])]);
  assert.equal(streakXp(split), 20 + 20);
});

test('bonusXp: challenges 50/150, records 30 x3 cap, achievements 25 once', () => {
  assert.equal(bonusXp({ challengeCompletions: [{ period: 'daily' }, { period: 'weekly' }] }), 200);
  assert.equal(bonusXp({ recordImprovements: [1, 2, 3, 4, 5] }), 90);
  assert.equal(bonusXp({ achievementUnlocks: [{ id: 'a' }, { id: 'a' }, { id: 'b' }] }), 50);
});

test('totalXp sums sessions + streak + bonuses', () => {
  const day = Date.UTC(2026, 8, 23, 12);
  const key = '2026-09-23';
  const value = totalXp([scored({ startedAt: day })], {
    dayMap: new Map([[key, { count: 1, words: 1000 }]]),
    challengeCompletions: [{ period: 'daily' }],
    achievementUnlocks: [{ id: 'first-session' }],
  });
  assert.equal(value, 125 + 0 + 50 + 25);
});

test('levelFor: exact boundaries, progress, max clamp', () => {
  assert.deepEqual(levelFor(0), { index: 0, name: 'Leaflet', threshold: 0, nextThreshold: 100, progress: 0 });
  assert.equal(levelFor(99).name, 'Leaflet');
  assert.equal(levelFor(100).name, 'Pamphlet');
  assert.equal(levelFor(299).index, 1);
  assert.equal(levelFor(300).index, 2);
  assert.equal(levelFor(50).progress, 0.5);
  assert.equal(levelFor(96000).index, 10);
  assert.equal(levelFor(999999).index, 10);
  assert.equal(levelFor(999999).progress, 1);
  assert.equal(levelFor(96000).nextThreshold, 96000);
});
