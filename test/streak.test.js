process.env.TZ = 'America/New_York';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayMap, streakStats } from '../src/lib/streak.js';

function ts(year, month, day) {
  return new Date(year, month - 1, day).getTime();
}

test('empty map', () => {
  const map = new Map();
  const res = streakStats(map, undefined);
  assert.deepStrictEqual(res, { current: 0, longest: 0, lastDay: null, activeToday: false });
});

test('same-day multiple sessions', () => {
  const sessions = [
    { startedAt: ts(2026, 9, 3), words: 10 },
    { startedAt: ts(2026, 9, 3), words: 20 },
  ];
  const map = dayMap(sessions);
  const todayKey = '2026-09-03';
  const res = streakStats(map, todayKey);
  assert.equal(res.current, 1);
  assert.equal(res.longest, 1);
  assert.equal(res.lastDay, todayKey);
  assert.equal(res.activeToday, true);
});

test('consecutive run 3 days', () => {
  const sessions = [
    { startedAt: ts(2026, 9, 1), words: 5 },
    { startedAt: ts(2026, 9, 2), words: 3 },
    { startedAt: ts(2026, 9, 3), words: 7 },
  ];
  const map = dayMap(sessions);
  const todayKey = '2026-09-03';
  const res = streakStats(map, todayKey);
  assert.equal(res.current, 3);
  assert.equal(res.longest, 3);
  assert.equal(res.lastDay, todayKey);
  assert.equal(res.activeToday, true);
});

test('gap breaks', () => {
  const sessions = [
    { startedAt: ts(2026, 9, 1), words: 1 },
    { startedAt: ts(2026, 9, 3), words: 1 },
  ];
  const map = dayMap(sessions);
  const todayKey = '2026-09-03';
  const res = streakStats(map, todayKey);
  assert.equal(res.current, 1);
  assert.equal(res.longest, 1);
  assert.equal(res.lastDay, '2026-09-03');
  assert.equal(res.activeToday, true);
});

test('yesterday-only alive', () => {
  const sessions = [
    { startedAt: ts(2026, 9, 2), words: 1 },
  ];
  const map = dayMap(sessions);
  const todayKey = '2026-09-03';
  const res = streakStats(map, todayKey);
  assert.equal(res.current, 1);
  assert.equal(res.longest, 1);
  assert.equal(res.lastDay, '2026-09-02');
  assert.equal(res.activeToday, false);
});

test('month boundary', () => {
  const sessions = [
    { startedAt: ts(2026, 1, 31), words: 2 },
    { startedAt: ts(2026, 2, 1), words: 2 },
  ];
  const map = dayMap(sessions);
  const todayKey = '2026-02-01';
  const res = streakStats(map, todayKey);
  assert.equal(res.current, 2);
  assert.equal(res.longest, 2);
  assert.equal(res.lastDay, todayKey);
  assert.equal(res.activeToday, true);
});

test('injected-today-stale', () => {
  // last active day far in the past; today is ignored, current should be 0
  const sessions = [
    { startedAt: ts(2026, 9, 1), words: 1 },
  ];
  const map = dayMap(sessions);
  const todayKey = '2026-09-05';
  const res = streakStats(map, todayKey);
  assert.equal(res.current, 0);
  assert.equal(res.longest, 1);
  assert.equal(res.lastDay, '2026-09-01');
  assert.equal(res.activeToday, false);
});

test('dst-longest', () => {
  // DST in effect in America/New_York; consecutive days around DST boundary
  const sessions = [
    { startedAt: ts(2026, 3, 7), words: 1 },
    { startedAt: ts(2026, 3, 8), words: 1 },
    { startedAt: ts(2026, 3, 9), words: 1 },
  ];
  const map = dayMap(sessions);
  const todayKey = '2026-03-09';
  const res = streakStats(map, todayKey);
  // DST may shorten a day, but still 3-day consecutive run when anchored at noon
  assert.equal(res.current, 3);
  assert.equal(res.longest, 3);
  assert.equal(res.lastDay, todayKey);
  assert.equal(res.activeToday, true);
});

test('malformed sessions skipped', () => {
  const sessions = [
    { startedAt: ts(2026, 9, 1), words: 5 },
    { startedAt: NaN, words: 3 },
    { startedAt: null, words: 2 },
  ];
  const map = dayMap(sessions);
  const todayKey = '2026-09-01';
  const res = streakStats(map, todayKey);
  // only one valid session day
  assert.equal(res.current, 1);
  assert.equal(res.longest, 1);
  assert.equal(res.lastDay, todayKey);
  assert.equal(res.activeToday, true);
});

test('year boundary: Dec 31 -> Jan 1 counts as a consecutive run', () => {
  const mk = (dates) => dayMap(dates.map((d) => ({ startedAt: new Date(`${d}T12:00:00`).getTime(), wordCount: 100 })));
  const stats = streakStats(mk(['2025-12-31', '2026-01-01']), '2026-01-01');
  assert.equal(stats.current, 2);
  assert.equal(stats.longest, 2);
});
