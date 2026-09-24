import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, evaluate } from '../src/lib/achievements.js';

const base = new Date(2026, 8, 1, 12).getTime();
const at = (day, hour = 12) => new Date(2026, 8, day, hour).getTime();

const session = (over = {}) => ({
  id: over.id ?? `s${over.endedAt ?? base}`,
  endedAt: base,
  startedAt: base,
  wordCount: 1000,
  elapsedMs: 600000,
  wpm: 300,
  comprehensionPct: 80,
  chunkSize: 2,
  textId: 'A',
  ...over,
});

const byId = (list) => new Map(list.map((a) => [a.id, a]));
const quiz = (pct, createdAt = base) => ({ id: `q${pct}-${createdAt}`, createdAt, score: { pct } });

test('catalog: 26 unique entries, every glyph non-empty, hidden flags correct', () => {
  assert.equal(ACHIEVEMENTS.length, 26);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 26);
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.glyph && a.glyph.length > 0, `${a.id} glyph`);
    assert.ok(a.title && a.requirement && a.category && a.rarity, `${a.id} fields`);
  }
  assert.equal(byId(ACHIEVEMENTS).get('comeback').hidden, true);
  assert.equal(byId(ACHIEVEMENTS).get('marathon').hidden, true);
  assert.deepEqual(ACHIEVEMENTS.map((a) => a.id), evaluate([], []).map((a) => a.id));
});

test('empty input: all locked, no Infinity, no throw', () => {
  const result = evaluate([], []);
  for (const a of result) {
    assert.equal(a.unlocked, false, a.id);
    assert.equal(a.unlockedAt, null, a.id);
    assert.ok(Number.isFinite(a.progress.pct), a.id);
  }
  assert.doesNotThrow(() => evaluate(null, null, null));
  assert.doesNotThrow(() => evaluate([null, {}, 'x'], [null], { today: undefined }));
});

test('first-session and first-quiz unlock at their crossing events', () => {
  const sessions = [session({ endedAt: at(2) }), session({ endedAt: at(1) })];
  const quizzes = [quiz(50, at(3))];
  const result = byId(evaluate(sessions, quizzes));
  assert.equal(result.get('first-session').unlocked, true);
  assert.equal(result.get('first-session').unlockedAt, at(1));
  assert.equal(result.get('first-quiz').unlocked, true);
  assert.equal(result.get('first-quiz').unlockedAt, at(3));
});

test('session and word milestones: progress capped, crossing timestamps', () => {
  const sessions = Array.from({ length: 12 }, (_, i) => session({ endedAt: at(1) + i * 60000, wordCount: 1000 }));
  const result = byId(evaluate(sessions, []));
  assert.equal(result.get('sessions-10').unlocked, true);
  assert.equal(result.get('sessions-10').unlockedAt, at(1) + 9 * 60000);
  assert.equal(result.get('sessions-25').unlocked, false);
  assert.deepEqual(result.get('sessions-25').progress, { current: 12, target: 25, pct: 48 });
  assert.equal(result.get('words-10k').unlocked, true);
  assert.equal(result.get('words-10k').unlockedAt, at(1) + 9 * 60000);
  assert.equal(result.get('words-100k').unlocked, false);
  assert.equal(result.get('words-100k').progress.current, 12000);
});

test('streak milestones use injected streakStats', () => {
  const result = byId(evaluate([session()], [], { streakStats: { current: 8, longest: 8 } }));
  assert.equal(result.get('streak-3').unlocked, true);
  assert.equal(result.get('streak-7').unlocked, true);
  assert.equal(result.get('streak-30').unlocked, false);
  assert.equal(result.get('streak-30').progress.current, 8);
});

test('five-of-seven: 5 distinct days in one Monday-start week', () => {
  const monday = new Date(2026, 8, 21, 12).getTime();
  const sessions = [0, 1, 2, 3, 4].map((i) => session({ endedAt: monday + i * 86400000, startedAt: monday + i * 86400000 }));
  const result = byId(evaluate(sessions, []));
  assert.equal(result.get('five-of-seven').unlocked, true);
  assert.equal(result.get('five-of-seven').unlockedAt, monday + 4 * 86400000);
  const four = byId(evaluate(sessions.slice(0, 4), []));
  assert.equal(four.get('five-of-seven').unlocked, false);
});

test('comeback: 14-day gap across all history', () => {
  const sessions = [
    session({ endedAt: at(1), startedAt: at(1) }),
    session({ endedAt: at(2), startedAt: at(2) }),
    session({ endedAt: at(20), startedAt: at(20) }),
  ];
  const result = byId(evaluate(sessions, []));
  assert.equal(result.get('comeback').unlocked, true);
  assert.equal(result.get('comeback').unlockedAt, at(20));
  const noGap = byId(evaluate([session({ endedAt: at(1), startedAt: at(1) }), session({ endedAt: at(5), startedAt: at(5) })], []));
  assert.equal(noGap.get('comeback').unlocked, false);
});

test('comprehension stamps and clean sweep', () => {
  const result = byId(evaluate([session({ comprehensionPct: 90, endedAt: at(1) })], [quiz(100, at(2))]));
  assert.equal(result.get('comprehension-80').unlocked, true);
  assert.equal(result.get('comprehension-90').unlocked, true);
  assert.equal(result.get('perfect-quiz').unlocked, true);
  assert.equal(result.get('perfect-quiz').unlockedAt, at(2));
});

test('speed stamps require >=80% comprehension and exclude drills', () => {
  const result = byId(evaluate([
    session({ wpm: 500, comprehensionPct: 80, endedAt: at(1) }),
  ], []));
  assert.equal(result.get('wpm-300').unlocked, true);
  assert.equal(result.get('wpm-450').unlocked, true);
  assert.equal(result.get('wpm-600').unlocked, false);
  const drill = byId(evaluate([session({ wpm: 900, comprehensionPct: 100, drill: 'span', endedAt: at(1) })], []));
  assert.equal(drill.get('wpm-300').unlocked, false);
  assert.equal(drill.get('comprehension-80').unlocked, false);
  const lowComp = byId(evaluate([session({ wpm: 500, comprehensionPct: 50, endedAt: at(1) })], []));
  assert.equal(lowComp.get('wpm-300').unlocked, false);
});

test('first-record: strict improvement only, drill excluded', () => {
  const improvement = byId(evaluate([
    session({ wpm: 300, endedAt: at(1) }),
    session({ wpm: 300, endedAt: at(2) }),
    session({ wpm: 350, endedAt: at(3) }),
  ], []));
  assert.equal(improvement.get('first-record').unlocked, true);
  assert.equal(improvement.get('first-record').unlockedAt, at(3));
  const flat = byId(evaluate([session({ wpm: 300, endedAt: at(1) }), session({ wpm: 300, endedAt: at(2) })], []));
  assert.equal(flat.get('first-record').unlocked, false);
  const drillOnly = byId(evaluate([session({ wpm: 500, drill: 'span', endedAt: at(1) }), session({ wpm: 400, drill: 'span', endedAt: at(2) })], []));
  assert.equal(drillOnly.get('first-record').unlocked, false);
});

test('sustained-improvement: 3 scored sessions, non-decreasing wpm, >=70% each', () => {
  const ok = byId(evaluate([
    session({ wpm: 300, comprehensionPct: 75, endedAt: at(1) }),
    session({ wpm: 320, comprehensionPct: 80, endedAt: at(2) }),
    session({ wpm: 320, comprehensionPct: 70, endedAt: at(3) }),
  ], []));
  assert.equal(ok.get('sustained-improvement').unlocked, true);
  assert.equal(ok.get('sustained-improvement').unlockedAt, at(3));
  const dip = byId(evaluate([
    session({ wpm: 300, comprehensionPct: 75, endedAt: at(1) }),
    session({ wpm: 280, comprehensionPct: 80, endedAt: at(2) }),
    session({ wpm: 300, comprehensionPct: 80, endedAt: at(3) }),
  ], []));
  assert.equal(dip.get('sustained-improvement').unlocked, false);
});

test('marathon: 45 minutes in one session, drill included', () => {
  const result = byId(evaluate([session({ elapsedMs: 45 * 60000, endedAt: at(1) })], []));
  assert.equal(result.get('marathon').unlocked, true);
  const short = byId(evaluate([session({ elapsedMs: 45 * 60000 - 1 })], []));
  assert.equal(short.get('marathon').unlocked, false);
});

test('texts-5 and drill-master count correctly', () => {
  const texts = [1, 2, 3, 4, 5].map((n) => session({ textId: `T${n}`, endedAt: at(n) }));
  const result = byId(evaluate(texts, []));
  assert.equal(result.get('texts-5').unlocked, true);
  assert.equal(result.get('texts-5').unlockedAt, at(5));
  const drills = Array.from({ length: 10 }, (_, i) => session({ drill: 'span', endedAt: at(1) + i * 1000 }));
  const drillResult = byId(evaluate(drills, []));
  assert.equal(drillResult.get('drill-master').unlocked, true);
  assert.equal(drillResult.get('drill-master').unlockedAt, at(1) + 9 * 1000);
  assert.equal(byId(evaluate(drills.slice(0, 9), [])).get('drill-master').unlocked, false);
});

test('drill quizzes never unlock quiz stamps', () => {
  const drill = session({ id: 'd1', drill: 'span', quizId: 'dq', endedAt: at(1) });
  const result = byId(evaluate([drill], [{ id: 'dq', createdAt: at(1), score: { pct: 100 } }]));
  assert.equal(result.get('first-quiz').unlocked, false);
  assert.equal(result.get('perfect-quiz').unlocked, false);
});

test('streak stamps unlock at the crossing day, not the first session', () => {
  const days = [1, 2, 3].map((d) => session({ endedAt: at(d), startedAt: at(d) }));
  const result = byId(evaluate(days, []));
  assert.equal(result.get('streak-3').unlocked, true);
  assert.equal(result.get('streak-3').unlockedAt, at(3));
});

test('comprehension stamps fall back to a linked quiz score', () => {
  const s = session({ comprehensionPct: null, quizId: 'q1', endedAt: at(1) });
  const result = byId(evaluate([s], [{ id: 'q1', createdAt: at(1), score: { pct: 95 } }]));
  assert.equal(result.get('comprehension-90').unlocked, true);
  assert.equal(result.get('comprehension-90').unlockedAt, at(1));
});
