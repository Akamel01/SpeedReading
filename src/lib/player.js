// RSVP timing engine (DOM-free). Deadline-anchored scheduler: each chunk's deadline is the
// previous deadline + its delay (no accumulated frame drift). Clock and scheduler are injectable.
// Contract: createPlayer({chunks, wpm, now, schedule}) -> {play, pause, toggle, seek, step, setWpm, getState, on}
// Events: 'chunk' {index, chunk, orpParts}, 'end', 'state' {playing, index, wpm}

import { orpParts } from './orp.js';

export function nextDelay(chunk, wpm) {
  return (chunk.words.length * 60000) / wpm;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function createPlayer({ chunks, wpm, now, schedule }) {
  const list = Array.isArray(chunks) ? chunks : [];
  const clock = typeof now === 'function'
    ? now
    : () => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());
  const scheduleFrame = typeof schedule === 'function'
    ? schedule
    : (cb) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(cb, 0));

  const listeners = new Map();
  let playing = false;
  let index = 0;
  let currentWpm = wpm ?? 60;
  let nextDue = 0;
  let endEmitted = false;
  let pendingEnd = false;

  function emit(event, payload) {
    const cbs = listeners.get(event);
    if (!cbs) return;
    for (const cb of Array.from(cbs)) {
      try {
        cb(payload);
      } catch {
        /* listener errors must not stop playback */
      }
    }
  }

  function emitState() {
    emit('state', { playing, index, wpm: currentWpm });
  }

  function finish() {
    playing = false;
    if (!endEmitted) {
      endEmitted = true;
      emit('end');
    }
    emitState();
  }

  function loop() {
    if (!playing) return;
    // Reviewer fix: the last chunk dwells for its own delay before 'end'.
    if (pendingEnd) {
      if (clock() >= nextDue) {
        finish();
      } else {
        scheduleFrame(loop);
      }
      return;
    }
    if (clock() >= nextDue) {
      const chunk = list[index];
      // Additive field (drill support): the first few words after this chunk, for
      // preview-zone rendering and recognition checks. Empty at stream end.
      const lookahead = [];
      for (let k = index + 1; k < list.length && lookahead.length < 3; k++) {
        for (const word of list[k].words) {
          if (lookahead.length < 3) lookahead.push(word.word);
        }
      }
      emit('chunk', { index, chunk, orpParts: chunk.words.map((w) => orpParts(w.word)), lookahead });
      // Chain from the previous deadline: fixed cadence, no frame-drift accumulation.
      nextDue += nextDelay(chunk, currentWpm);
      index += 1;
      if (index >= list.length) pendingEnd = true;
    }
    scheduleFrame(loop);
  }

  const api = {
    play() {
      if (list.length === 0) {
        playing = false;
        finish();
        return;
      }
      if (playing) return;
      playing = true;
      endEmitted = false;
      pendingEnd = false;
      if (index >= list.length) index = 0; // reviewer fix: replay after end restarts
      nextDue = clock() + nextDelay(list[index], currentWpm);
      emitState();
      scheduleFrame(loop);
    },
    pause() {
      if (!playing) return;
      playing = false;
      emitState();
    },
    toggle() {
      if (playing) api.pause();
      else api.play();
    },
    seek(i) {
      if (list.length === 0) {
        index = 0;
        emitState();
        return;
      }
      index = clamp(i, 0, Math.max(0, list.length - 1));
      endEmitted = false;
      pendingEnd = false;
      nextDue = clock() + nextDelay(list[index], currentWpm);
      if (playing) scheduleFrame(loop);
      emitState();
    },
    step(delta) {
      api.seek(index + delta);
    },
    setWpm(n) {
      currentWpm = n;
      // Applies from the next chunk: the current deadline is already anchored.
      emitState();
    },
    getState() {
      return { playing, index, wpm: currentWpm };
    },
    on(event, cb) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(cb);
      return () => listeners.get(event).delete(cb);
    },
  };

  return api;
}
