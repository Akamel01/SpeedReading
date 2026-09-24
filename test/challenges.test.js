process.env.TZ = 'America/New_York';
import test from 'node:test';
import assert from 'node:assert/strict';
import { challengeFor, challengeProgress } from '../src/lib/challenges.js';

const DAY = 86400000;

test('challengeFor: daily rotates through all three ids over three days', () => {
  const base = new Date(2026, 8, 22, 12);
  const ids = [0, 1, 2].map((i) => challengeFor(new Date(base.getTime() + i * DAY), 'daily').id);
  assert.equal(new Set(ids).size, 3);
  assert.deepEqual(challengeFor(new Date(2026, 8, 22, 12), 'daily'), challengeFor(new Date(2026, 8, 22, 23), 'daily'));
});

test('challengeFor: weekly is stable within a Monday-start week and rotates next week', () => {
  const monday = new Date(2026, 8, 21, 9);
  const sunday = new Date(2026, 8, 27, 23);
  const nextMonday = new Date(2026, 8, 28, 9);
  assert.equal(challengeFor(monday, 'weekly').id, challengeFor(sunday, 'weekly').id);
  assert.notEqual(challengeFor(monday, 'weekly').id, challengeFor(nextMonday, 'weekly').id);
});

test('challengeFor: DST week stays one week (no fixed-ms drift)', () => {
  const before = new Date(2026, 2, 7, 12);
  const after = new Date(2026, 2, 8, 12);
  assert.equal(challengeFor(before, 'weekly').id, challengeFor(after, 'weekly').id);
  assert.notEqual(challengeFor(before, 'daily').id, challengeFor(after, 'daily').id);
});

test('challengeFor: invalid now returns null (no throw)', () => {
  assert.equal(challengeFor(NaN, 'daily'), null);
  assert.equal(challengeFor(undefined, 'weekly'), null);
});

test('challengeProgress: daily window counts only today and matches the active challenge', () => {
  const now = new Date(2026, 8, 22, 12);
  const today = now.getTime();
  const yesterday = today - DAY;
  const sessions = [
    { startedAt: today, wordCount: 600, elapsedMs: 700000, comprehensionPct: 70 },
    { startedAt: yesterday, wordCount: 9999, elapsedMs: 999999, comprehensionPct: 90 },
  ];
  const { daily } = challengeProgress({ sessions, quizzes: [] }, { now });
  const active = challengeFor(now, 'daily');
  assert.equal(daily.id, active.id);
  if (active.id === 'd-read') { assert.equal(daily.current, 600); assert.equal(daily.complete, true); }
  if (active.id === 'd-comprehend') { assert.equal(daily.current, 1); assert.equal(daily.complete, true); }
  if (active.id === 'd-focus') { assert.equal(daily.current, 700000); assert.equal(daily.complete, true); }
  assert.ok(daily.pct >= 0 && daily.pct <= 100);
  assert.equal(daily.periodStart, new Date(2026, 8, 22).getTime());
  assert.equal(daily.periodEnd, new Date(2026, 8, 23).getTime());
});

test('challengeProgress: incomplete state is monotonic-safe and clamped', () => {
  const now = new Date(2026, 8, 22, 12);
  const { daily } = challengeProgress({ sessions: [], quizzes: [] }, { now });
  assert.equal(daily.current, 0);
  assert.equal(daily.pct, 0);
  assert.equal(daily.complete, false);
  assert.equal(daily.xp, 50);
});

test('challengeProgress: weekly windows, distinct days and good quizzes', () => {
  const now = new Date(2026, 8, 23, 12); // Wednesday
  const monday = new Date(2026, 8, 21).getTime();
  const sessions = [
    { startedAt: monday, wordCount: 2000 },
    { startedAt: monday + 3600000, wordCount: 2000 },
    { startedAt: monday + DAY, wordCount: 2000 },
  ];
  const quizzes = [
    { createdAt: monday, score: { pct: 80 } },
    { createdAt: monday + DAY, score: { pct: 70 } },
    { createdAt: monday - 8 * DAY, score: { pct: 100 } },
  ];
  const { weekly } = challengeProgress({ sessions, quizzes }, { now });
  assert.equal(weekly.periodStart, monday);
  assert.equal(weekly.xp, 150);
  if (weekly.id === 'w-volume') assert.equal(weekly.current, 6000);
  if (weekly.id === 'w-days') assert.equal(weekly.current, 2);
  if (weekly.id === 'w-comprehend') assert.equal(weekly.current, 2);
});

test('challengeProgress: malformed input never throws', () => {
  assert.doesNotThrow(() => challengeProgress(undefined, { now: new Date(2026, 8, 22) }));
  assert.doesNotThrow(() => challengeProgress({ sessions: [null, {}, 3], quizzes: [null] }, { now: new Date(2026, 8, 22) }));
  assert.doesNotThrow(() => challengeProgress({ sessions: [] }, { now: NaN }));
});

test('catalog matches ADR-24 ids and xp', () => {
  const dailyIds = [0, 1, 2].map((i) => challengeFor(new Date(2026, 8, 22 + i), 'daily').id).sort();
  assert.deepEqual(dailyIds, ['d-comprehend', 'd-focus', 'd-read']);
  assert.equal(challengeFor(new Date(2026, 8, 22), 'daily').xp, 50);
  assert.equal(challengeFor(new Date(2026, 8, 22), 'weekly').xp, 150);
});

test('w-comprehend excludes quizzes linked to drill sessions', () => {
  const monday = new Date(2026, 8, 21).getTime();
  const sessions = [{ startedAt: monday, drill: 'span', quizId: 'dq', wordCount: 10 }];
  const quizzes = [{ id: 'dq', createdAt: monday, score: { pct: 90 } }];
  const { weekly } = challengeProgress({ sessions, quizzes }, { now: new Date(2026, 8, 23, 12) });
  assert.equal(weekly.id, 'w-comprehend');
  assert.equal(weekly.current, 0);
});
