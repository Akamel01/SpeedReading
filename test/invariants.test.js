import { test } from 'node:test';
import assert from 'node:assert/strict';
import { totalXp, levelFor } from '../src/lib/xp.js';
import { dayMap } from '../src/lib/streak.js';
import { facts } from '../src/lib/events.js';

function makeS(id, end, words = 100, wpm = 60, comp = 75) {
  return { id, startedAt: id.charCodeAt(0), endedAt: end, wordCount: words, wpm, comprehensionPct: comp };
}

test('I1: XP monotonic over append', () => {
  const a = makeS('a', 1000, 120, 60, 70);
  const b = makeS('b', 2000, 100, 70, 80);
  const c = makeS('c', 3000, 150, 80, 75);
  const xp1 = totalXp([a]);
  const xp2 = totalXp([a, b]);
  const xp3 = totalXp([a, b, c]);
  assert.ok(xp1 <= xp2, 'xp should not decrease after adding second session');
  assert.ok(xp2 <= xp3, 'xp should not decrease after adding third session');
});

test('I2: no double award on duplicates', () => {
  const s = makeS('dup', 1000, 100, 60, 70);
  const f1 = facts({ sessions: [s] });
  const f2 = facts({ sessions: [s, s] });
  assert.deepEqual(f2, f1, 'duplicate sessions should not create extra facts');
});

test('I7: level corresponds to XP (round-trip)', () => {
  const s1 = makeS('a', 1000, 120, 60, 70);
  const s2 = makeS('b', 2000, 110, 65, 75);
  const xpTotal = totalXp([s1, s2], { dayMap: dayMap([s1, s2]) });
  const lvl = levelFor(xpTotal);
  const xpFromLevel = lvl.threshold + lvl.progress * (lvl.nextThreshold - lvl.threshold);
  assert.ok(Math.abs(xpFromLevel - xpTotal) < 1e-9, 'round-trip XP to level must match');
});

test('I1/I2: deterministic PRNG property loop over appended sessions', () => {
  let seed = 42;
  const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const sessions = [];
  let prev = 0;
  for (let i = 0; i < 40; i++) {
    const startedAt = 1000 + i * 60000;
    sessions.push({
      id: `p${i}`,
      startedAt,
      endedAt: startedAt + 30000,
      wordCount: Math.floor(rand() * 2000),
      wpm: 100 + Math.floor(rand() * 500),
      comprehensionPct: Math.floor(rand() * 101),
    });
    const xp = totalXp(sessions);
    assert.ok(xp >= prev, `xp monotonic at ${i}`);
    prev = xp;
    const once = facts({ sessions });
    const twice = facts({ sessions: sessions.concat(sessions[sessions.length - 1]) });
    assert.equal(twice.length, once.length, `no double fact at ${i}`);
  }
});
