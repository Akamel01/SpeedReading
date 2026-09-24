import test from 'node:test';
import assert from 'node:assert/strict';
import { facts, rewardMoments, sessionMoments } from '../src/lib/events.js';

const at = (day, hour = 12) => new Date(2026, 8, day, hour).getTime();
const session = (over = {}) => ({
  id: over.id ?? 's1',
  endedAt: at(1),
  startedAt: at(1),
  wordCount: 1000,
  elapsedMs: 600000,
  wpm: 300,
  comprehensionPct: 80,
  chunkSize: 2,
  textId: 'A',
  quizId: null,
  ...over,
});
const quiz = (id, pct, createdAt = at(1)) => ({ id, createdAt, score: { pct } });

test('facts: session + linked quiz events, sorted and unique-keyed', () => {
  const result = facts({
    sessions: [session({ id: 'a', endedAt: at(2), quizId: 'q1' }), session({ id: 'b', endedAt: at(1) })],
    quizzes: [quiz('q1', 80, at(3))],
  });
  assert.deepEqual(result.map((f) => f.key), ['session:b', 'session:a', 'quiz:a']);
  assert.deepEqual(result.map((f) => f.type), ['session.completed', 'session.completed', 'session.quiz_completed']);
  assert.equal(result[2].sessionId, 'a');
});

test('facts: malformed skipped; unlinked quizzes omitted; duplicates deduped by key', () => {
  const s = session({ id: 'a', quizId: 'q1' });
  const result = facts({
    sessions: [s, s, null, {}, { id: 'x', endedAt: NaN }, { id: 'y' }],
    quizzes: [quiz('q1', 80, at(2)), quiz('orphan', 90), null],
  });
  assert.deepEqual(result.map((f) => f.key), ['session:a', 'quiz:a']);
});

test('rewardMoments: priority order and moment types', () => {
  const sessions = [
    session({ id: 'a', endedAt: at(1), wpm: 300 }),
    session({ id: 'b', endedAt: at(2), wpm: 400 }),
  ];
  const moments = rewardMoments({ sessions, quizzes: [], today: at(2) });
  const priorities = moments.map((m) => m.priority);
  assert.deepEqual(priorities, priorities.slice().sort((x, y) => x - y));
  assert.ok(moments.some((m) => m.type === 'record'));
  assert.ok(moments.some((m) => m.type === 'achievement'));
  assert.ok(moments.some((m) => m.type === 'level'));
});

test('rewardMoments: level-up fires at the crossing session', () => {
  const sessions = [session({ id: 'a', endedAt: at(1), wordCount: 1000 })];
  const moments = rewardMoments({ sessions, quizzes: [], today: at(1) });
  const level = moments.find((m) => m.type === 'level');
  assert.ok(level, 'level moment present');
  assert.equal(level.at, at(1));
  assert.equal(level.payload.name, 'Pamphlet');
});

test('rewardMoments: challenge completion only for the current period', () => {
  const day = new Date(2026, 8, 22, 12);
  const sessions = [session({ id: 'a', endedAt: day.getTime(), startedAt: day.getTime(), wordCount: 2000, comprehensionPct: 80 })];
  const moments = rewardMoments({ sessions, quizzes: [], today: day.getTime() });
  const challenges = moments.filter((m) => m.type === 'challenge');
  assert.equal(challenges.length, 1);
  assert.equal(challenges[0].priority, 4);
});

test('sessionMoments: only the target session\'s moments', () => {
  const sessions = [
    session({ id: 'a', endedAt: at(1), startedAt: at(1), wpm: 300 }),
    session({ id: 'b', endedAt: at(2), startedAt: at(2), wpm: 400 }),
  ];
  const all = rewardMoments({ sessions, quizzes: [], today: at(2) });
  const onlyB = sessionMoments({ sessions, quizzes: [], today: at(2), sessionId: 'b' });
  const onlyA = sessionMoments({ sessions, quizzes: [], today: at(2), sessionId: 'a' });
  assert.ok(onlyB.length >= 1);
  assert.ok(onlyB.some((m) => (m.payload ?? {}).sessionId === 'b'));
  assert.ok(onlyB.every((m) => {
    const p = m.payload ?? {};
    if (p.sessionId) return p.sessionId === 'b';
    if (p.day) return p.day === '2026-09-02';
    return m.at === at(2);
  }));
  assert.ok(onlyA.every((m) => {
    const p = m.payload ?? {};
    if (p.sessionId) return p.sessionId === 'a';
    if (p.day) return p.day === '2026-09-01';
    return m.at === at(1);
  }));
  assert.ok(onlyA.every((m) => !(m.payload ?? {}).sessionId || m.payload.sessionId === 'a'));
  assert.ok(all.length >= onlyB.length);
  assert.deepEqual(sessionMoments({ sessions, quizzes: [], sessionId: 'missing' }), []);
  assert.deepEqual(sessionMoments({ sessions, quizzes: [] }), []);
});
