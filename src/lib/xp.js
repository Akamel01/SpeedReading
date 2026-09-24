// src/lib/xp.js — pure XP + level engine (ADR-24). No DOM, no clock, no deps.

export const LEVELS = [
  { index: 0, name: 'Leaflet', threshold: 0 },
  { index: 1, name: 'Pamphlet', threshold: 100 },
  { index: 2, name: 'Chapbook', threshold: 300 },
  { index: 3, name: 'Novella', threshold: 700 },
  { index: 4, name: 'Paperback', threshold: 1500 },
  { index: 5, name: 'Hardcover', threshold: 3000 },
  { index: 6, name: 'Tome', threshold: 6000 },
  { index: 7, name: 'Codex', threshold: 12000 },
  { index: 8, name: 'Compendium', threshold: 24000 },
  { index: 9, name: 'Scriptorium', threshold: 48000 },
  { index: 10, name: 'Library', threshold: 96000 },
];

const DAILY_SESSION_CAP = 500;

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function localDayKey(ts) {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function daySerial(key) {
  const parts = String(key).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return NaN;
  return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
}

// One session's XP. Drill sessions earn half-rate words + recognition only.
// repeatIndex: 0 for the first session on a text that local day, 1+ for repeats (words ×0.5).
export function sessionXp(session, { repeatIndex = 0 } = {}) {
  if (!session || !isNum(session.wordCount)) return 0;
  const words = Math.max(0, session.wordCount);
  const isDrill = session.drill === 'span';
  let base = isDrill ? Math.floor(words / 20) : Math.floor(words / 10);
  if (!isDrill && repeatIndex > 0) base = Math.floor(base * 0.5);
  let xp = base;
  if (isDrill) {
    if (isNum(session.correct)) xp += Math.min(20, Math.max(0, Math.floor(session.correct)));
  } else {
    const pct = isNum(session.comprehensionPct) ? session.comprehensionPct : null;
    if (pct !== null) {
      if (pct >= 80) xp += 20;
      else if (pct >= 60) xp += 10;
      if (pct >= 60 && isNum(session.wpm) && isNum(session.targetWpm) && session.wpm >= session.targetWpm) xp += 15;
    }
  }
  return xp;
}

// All sessions' XP with the daily cap and the same-text same-local-day repeat factor.
export function sessionsXp(sessions) {
  if (!Array.isArray(sessions)) return 0;
  const byDay = new Map();
  for (const s of sessions) {
    if (!s || !isNum(s.startedAt)) continue;
    const key = localDayKey(s.startedAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(s);
  }
  let total = 0;
  for (const list of byDay.values()) {
    list.sort((a, b) => a.startedAt - b.startedAt);
    const seen = new Map();
    let daySum = 0;
    for (const s of list) {
      const tid = s.textId ?? '';
      const repeatIndex = seen.get(tid) ?? 0;
      seen.set(tid, repeatIndex + 1);
      daySum += sessionXp(s, { repeatIndex });
    }
    total += Math.min(DAILY_SESSION_CAP, daySum);
  }
  return total;
}

// Streak XP from the streak dayMap: +10 per day beyond the first in a run,
// +50 per complete 7-consecutive-day block. Calendar arithmetic (DST-safe).
export function streakXp(dayMap) {
  let keys = [];
  if (dayMap instanceof Map) keys = [...dayMap.keys()];
  else if (dayMap && typeof dayMap === 'object') keys = Object.keys(dayMap);
  const serials = keys.map(daySerial).filter(isNum).sort((a, b) => a - b);
  if (serials.length === 0) return 0;
  const runXp = (len) => (len - 1) * 10 + Math.floor(len / 7) * 50;
  let xp = 0;
  let run = 1;
  for (let i = 1; i < serials.length; i++) {
    if (serials[i] === serials[i - 1] + 1) run += 1;
    else { xp += runXp(run); run = 1; }
  }
  xp += runXp(run);
  return xp;
}

// Bonus XP: daily challenge +50, weekly +150, record improvement +30 (max 3 = 90),
// achievement unlock +25 once per id.
export function bonusXp({ challengeCompletions = [], recordImprovements = [], achievementUnlocks = [] } = {}) {
  let xp = 0;
  const challenges = Array.isArray(challengeCompletions) ? challengeCompletions : [];
  for (const c of challenges) xp += c && c.period === 'weekly' ? 150 : 50;
  const improvements = Array.isArray(recordImprovements) ? recordImprovements.slice(0, 3) : [];
  xp += improvements.length * 30;
  const unlocks = Array.isArray(achievementUnlocks) ? achievementUnlocks : [];
  const ids = new Set();
  for (const a of unlocks) {
    const id = a && typeof a === 'object' ? a.id : a;
    if (id === undefined || id === null) continue;
    if (ids.has(id)) continue;
    ids.add(id);
    xp += 25;
  }
  return xp;
}

export function totalXp(sessions, { dayMap, challengeCompletions, recordImprovements, achievementUnlocks } = {}) {
  return sessionsXp(sessions)
    + streakXp(dayMap)
    + bonusXp({ challengeCompletions, recordImprovements, achievementUnlocks });
}

export function levelFor(xp) {
  const value = isNum(xp) ? Math.max(0, xp) : 0;
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (value >= l.threshold) level = l;
    else break;
  }
  const atMax = level.index === LEVELS.length - 1;
  const nextThreshold = atMax ? level.threshold : LEVELS[level.index + 1].threshold;
  const progress = atMax ? 1 : Math.min(1, Math.max(0, (value - level.threshold) / (nextThreshold - level.threshold)));
  return { index: level.index, name: level.name, threshold: level.threshold, nextThreshold, progress };
}
