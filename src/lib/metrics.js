"use strict";

// Pure progress metrics helpers for SpeedReading ADR-9 between-session guidance.

// Words per minute: guards against invalid elapsed time and returns 0 on
// invalid inputs to satisfy contract semantics.
export function wpm(wordCount, elapsedMs) {
  if (typeof wordCount !== 'number' || typeof elapsedMs !== 'number') return 0;
  if (elapsedMs <= 0) return 0;
  const value = (wordCount * 60000) / elapsedMs;
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  return value;
}

// Comprehension percentage: 0-100, with total === 0 producing 0.
export function comprehensionPct(correct, total) {
  if (typeof correct !== 'number' || typeof total !== 'number') return 0;
  if (total <= 0) return 0;
  const pct = (correct / total) * 100;
  if (!Number.isFinite(pct)) return 0;
  // clamp to [0, 100]
  return Math.max(0, Math.min(100, pct));
}

// Summary across multiple sessions.
// Sessions: array of { wpm: number, comprehensionPct: number }
export function summarize(sessions) {
  if (!Array.isArray(sessions)) {
    return { sessions: 0, bestWpm: 0, avgWpm: 0, avgComprehension: 0, trend: 'flat' };
  }
  const n = sessions.length;
  let bestWpm = 0;
  let sumWpm = 0;
  let sumComprehension = 0;
  for (const s of sessions) {
    const w = typeof s?.wpm === 'number' ? s.wpm : 0;
    const c = typeof s?.comprehensionPct === 'number' ? s.comprehensionPct : (typeof s?.comprehension === 'number' ? s.comprehension : 0);
    if (w > bestWpm) bestWpm = w;
    sumWpm += w;
    sumComprehension += c;
  }
  const avgWpm = n > 0 ? sumWpm / n : 0;
  const avgComprehension = n > 0 ? sumComprehension / n : 0;

  // Trend: compare last half vs first half. If fewer than 4 sessions, flat.
  let trend = 'flat';
  if (n >= 4) {
    const half = Math.floor(n / 2);
    const firstHalfWpm = sessions
      .slice(0, half)
      .reduce((acc, s) => acc + (typeof s?.wpm === 'number' ? s.wpm : 0), 0) / half;
    const lastHalfWpm = sessions
      .slice(n - half)
      .reduce((acc, s) => acc + (typeof s?.wpm === 'number' ? s.wpm : 0), 0) / half;
    if (lastHalfWpm > firstHalfWpm) trend = 'up';
    else if (lastHalfWpm < firstHalfWpm) trend = 'down';
    else trend = 'flat';
  }

  return {
    sessions: n,
    bestWpm,
    avgWpm,
    avgComprehension,
    trend,
  };
}

// Suggest next target WPM based on last session's results.
// If lastComprehensionPct >= 80 -> +10%
// If lastComprehensionPct < 60 -> -10%
// Else unchanged. Round to integer. Never below 60.
export function suggestNextWpm(lastWpm, lastComprehensionPct) {
  if (!Number.isFinite(lastWpm) || !Number.isFinite(lastComprehensionPct)) {
    return 60;
  }
  let next;
  if (lastComprehensionPct >= 80) {
    next = Math.round(lastWpm * 1.10);
  } else if (lastComprehensionPct < 60) {
    next = Math.round(lastWpm * 0.90);
  } else {
    next = Math.round(lastWpm);
  }
  if (next < 60) next = 60;
  return next;
}
