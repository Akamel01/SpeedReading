"use strict";

import { test } from 'node:test';
import assert from 'node:assert';
import { wpm, comprehensionPct, summarize, suggestNextWpm, sessionTicks, activeMs } from '../src/lib/metrics.js';

test('wpm basic', () => {
  assert.equal(wpm(300, 60000), 300);
});

test('wpm guard elapsed zero', () => {
  assert.equal(wpm(300, 0), 0);
});

test('comprehensionPct boundaries', () => {
  assert.equal(comprehensionPct(3, 4), 75);
  assert.equal(comprehensionPct(1, 0), 0);
  assert.equal(comprehensionPct(2, 2), 100);
});

test('summarize multiple sessions reads comprehensionPct', () => {
  const sessions = [
    { wpm: 60, comprehensionPct: 80 },
    { wpm: 80, comprehensionPct: 90 },
    { wpm: 70, comprehensionPct: 60 },
    { wpm: 90, comprehensionPct: 85 },
  ];
  const res = summarize(sessions);
  // basic aggregates
  assert.equal(res.sessions, 4);
  assert.equal(res.bestWpm, 90);
  const expectedAvgWpm = (60 + 80 + 70 + 90) / 4;
  assert(Math.abs(res.avgWpm - expectedAvgWpm) < 1e-9);
  const expectedAvgComprehension = (80 + 90 + 60 + 85) / 4;
  assert(Math.abs(res.avgComprehension - expectedAvgComprehension) < 1e-9);
  // trend: last half (last 2) avg = (70+90)/2 = 80; first half (60+80)/2 = 70 -> up
  assert.equal(res.trend, 'up');
});

test('summarize with few sessions -> flat', () => {
  const sessions = [
    { wpm: 70, comprehensionPct: 70 },
    { wpm: 80, comprehensionPct: 80 },
    { wpm: 90, comprehensionPct: 60 },
  ];
  const res = summarize(sessions);
  // fewer than 4 sessions -> flat
  assert.equal(res.trend, 'flat');
});

test('suggestNextWpm adheres to rules', () => {
  // >=80 comprehension -> +10%
  assert.equal(suggestNextWpm(300, 80), 330);
  // <60 comprehension -> -10%
  assert.equal(suggestNextWpm(70, 50), 63);
  // unchanged in mid-range -> 60 stays 60
  assert.equal(suggestNextWpm(60, 60), 60);
  // high lastWpm with >=80 comprehension -> +10%
  assert.equal(suggestNextWpm(83, 85), 91);
  // clamp to minimum 60
  assert.equal(suggestNextWpm(50, 85), 60);
});

test('summarize reads comprehension from fallback field', () => {
  const sessions = [ { wpm: 100, comprehension: 70 }, { wpm: 50, comprehensionPct: 60 } ];
  const res = summarize(sessions);
  // average comprehension should use 70 and 60 -> 65
  assert(Math.abs(res.avgComprehension - 65) < 1e-9);
});

test('purity: input not mutated', () => {
  const sessions = [ { wpm: 100, comprehensionPct: 80 } ];
  const before = JSON.stringify(sessions);
  summarize(sessions);
  const after = JSON.stringify(sessions);
  assert.equal(before, after);
});

// New tests for activeMs
test('activeMs empty', () => {
  const res = activeMs([]);
  assert.equal(res, 0);
});

test('activeMs single event -> 0', () => {
  const res = activeMs([{ at: 0, expectedMs: 100 }]);
  assert.equal(res, 0);
});

test('activeMs simple gap sums', () => {
  const events = [
    { at: 0, expectedMs: 100 },
    { at: 50, expectedMs: 100 },
  ];
  const res = activeMs(events);
  // gap 50, cap = 100*4+250 = 650 -> min = 50
  assert.equal(res, 50);
});

test('activeMs cap for large gaps', () => {
  const events = [
    { at: 0, expectedMs: 100 },
    { at: 1000, expectedMs: 100 },
  ];
  const res = activeMs(events);
  // gap 1000, cap 650 -> 650
  assert.equal(res, 650);
});

test('activeMs multiple gaps', () => {
  const events = [
    { at: 0, expectedMs: 100 },
    { at: 50, expectedMs: 100 },
    { at: 900, expectedMs: 80 },
  ];
  const res = activeMs(events);
  // gaps: 50 (min 50) + 850 (cap 100*4+250 = 650) => 50 + 650 = 700
  assert.equal(res, 700);
});

// New tests for sessionTicks
test('sessionTicks marks first max wpm as best', () => {
  const sessions = [
    { wpm: 100 },
    { wpm: 150 },
    { wpm: 150 }
  ];
  const ticks = sessionTicks(sessions);
  const expected = [
    { wpm: 100, comprehensionPct: null, best: false },
    { wpm: 150, comprehensionPct: null, best: true },
    { wpm: 150, comprehensionPct: null, best: false }
  ];
  assert.deepStrictEqual(ticks, expected);
});

test('sessionTicks handles comprehensionPct and missing values', () => {
  const sessions = [
    { wpm: 80, comprehensionPct: 60 },
    { wpm: 90 }
  ];
  const ticks = sessionTicks(sessions);
  const expected = [
    { wpm: 80, comprehensionPct: 60, best: false },
    { wpm: 90, comprehensionPct: null, best: true }
  ];
  assert.deepStrictEqual(ticks, expected);
});

test('sessionTicks empty input', () => {
  const ticks = sessionTicks([]);
  assert.deepStrictEqual(ticks, []);
});
