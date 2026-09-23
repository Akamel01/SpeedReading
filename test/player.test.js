import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, nextDelay } from '../src/lib/player.js';

// Deterministic fake clock + scheduler. The drain advances time in small steps,
// which exercises the deadline-anchored loop without real timers.
let t = 0;
let queue = [];
function now() {
  return t;
}
function schedule(cb) {
  queue.push(cb);
}
function resetTime() {
  t = 0;
  queue = [];
}
function drain(maxSteps = 2000, stepMs = 100) {
  let steps = 0;
  while (queue.length > 0) {
    const cb = queue.shift();
    cb();
    t += stepMs;
    steps += 1;
    if (steps > maxSteps) throw new Error('scheduler did not settle');
  }
}

function pump(steps, stepMs = 100) {
  for (let i = 0; i < steps && queue.length > 0; i++) {
    queue.shift()();
    t += stepMs;
  }
}

const chunkOf = (...words) => ({ words: words.map((word) => ({ word })) });

test('nextDelay scales with chunk word count', () => {
  assert.equal(nextDelay(chunkOf('A'), 60), 1000);
  assert.equal(nextDelay(chunkOf('A', 'B'), 60), 2000);
});

test('emits one chunk event per deadline, then end once', () => {
  resetTime();
  const events = [];
  const p = createPlayer({ chunks: [chunkOf('A'), chunkOf('B', 'C')], wpm: 60, now, schedule });
  p.on('chunk', (e) => events.push(e.index));
  p.on('end', () => events.push('end'));
  p.play();
  drain();
  assert.deepEqual(events, [0, 1, 'end']);
});

test('orpParts are computed per word from lib/orp', () => {
  resetTime();
  const events = [];
  const p = createPlayer({ chunks: [chunkOf('reading')], wpm: 60, now, schedule });
  p.on('chunk', (e) => events.push(e.orpParts));
  p.play();
  drain();
  assert.deepEqual(events[0], [{ left: 're', orp: 'a', right: 'ding' }]);
});

test('pause stops emissions; play resumes from same index', () => {
  resetTime();
  const seen = [];
  const p = createPlayer({ chunks: [chunkOf('A'), chunkOf('B'), chunkOf('C')], wpm: 60, now, schedule });
  p.on('chunk', (e) => seen.push(e.index));
  p.play();
  pump(2); // t=200ms; first chunk due at 1000ms -> nothing emitted yet
  p.pause();
  const afterPause = seen.length;
  p.play();
  drain();
  assert.equal(afterPause, 0);
  assert.deepEqual(seen, [0, 1, 2]);
});

test('seek and step clamp to bounds', () => {
  resetTime();
  const p = createPlayer({ chunks: [chunkOf('A'), chunkOf('B'), chunkOf('C')], wpm: 60, now, schedule });
  p.seek(99);
  assert.equal(p.getState().index, 2);
  p.step(-99);
  assert.equal(p.getState().index, 0);
});

test('setWpm applies from the next chunk deadline only', () => {
  resetTime();
  const p = createPlayer({ chunks: [chunkOf('A'), chunkOf('B')], wpm: 60, now, schedule });
  const emittedAt = [];
  p.on('chunk', () => emittedAt.push(t));
  p.play();
  p.setWpm(120);
  drain();
  // chunk 0 due at t=1000 (wpm 60); chunk 1 chained at 1000 + 2? no: 1 word at 120wpm = 500 -> ~1500
  assert.equal(emittedAt[0], 1000);
  assert.equal(emittedAt[1], 1500);
});

test('emits state events on transitions and getState is accurate', () => {
  resetTime();
  const states = [];
  const p = createPlayer({ chunks: [chunkOf('A')], wpm: 300, now, schedule });
  p.on('state', (s) => states.push({ ...s }));
  assert.deepEqual(p.getState(), { playing: false, index: 0, wpm: 300 });
  p.play();
  assert.deepEqual(states[0], { playing: true, index: 0, wpm: 300 });
  drain();
  assert.deepEqual(p.getState(), { playing: false, index: 1, wpm: 300 });
  assert.ok(states.some((s) => s.playing === false));
});

test('last chunk dwells its own delay before end (reviewer fix)', () => {
  resetTime();
  const marks = [];
  const p = createPlayer({ chunks: [chunkOf('A')], wpm: 60, now, schedule });
  p.on('chunk', () => marks.push(['chunk', t]));
  p.on('end', () => marks.push(['end', t]));
  p.play();
  drain();
  assert.deepEqual(marks, [['chunk', 1000], ['end', 2000]]);
});

test('replay after end restarts from first chunk without crashing (reviewer fix)', () => {
  resetTime();
  const seen = [];
  const p = createPlayer({ chunks: [chunkOf('A'), chunkOf('B')], wpm: 60, now, schedule });
  p.on('chunk', (e) => seen.push(e.index));
  p.play();
  drain();
  p.play();
  drain();
  assert.deepEqual(seen, [0, 1, 0, 1]);
});

test('seek/step on empty list are safe (reviewer fix)', () => {
  resetTime();
  const p = createPlayer({ chunks: [], wpm: 60, now, schedule });
  p.seek(5);
  p.step(2);
  assert.equal(p.getState().index, 0);
});

test('empty chunk list ends immediately without hanging', () => {
  resetTime();
  let ended = 0;
  const p = createPlayer({ chunks: [], wpm: 300, now, schedule });
  p.on('end', () => {
    ended += 1;
  });
  p.play();
  drain();
  assert.equal(ended, 1);
});
