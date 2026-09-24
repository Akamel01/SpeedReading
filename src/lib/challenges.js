// src/lib/challenges.js — daily/weekly challenges (ADR-24). Pure; injected `now`.
// Rotation: daily `daySerial % 3`, weekly Monday-start `weekIndex % 3`.
// All date arithmetic uses local date parts (DST-safe), never fixed-ms day addition.

const DAILY = [
  { id: 'd-read', title: 'Read 500 words today', description: 'Read 500 words today.', target: 500, unit: 'words', xp: 50 },
  { id: 'd-comprehend', title: 'Finish a quiz with at least 60% today', description: 'Finish one scored session at 60% comprehension or more.', target: 1, unit: 'scored session', xp: 50 },
  { id: 'd-focus', title: 'Read actively for 10 minutes today', description: 'Accumulate ten minutes of active reading.', target: 600000, unit: 'ms', xp: 50 },
];

const WEEKLY = [
  { id: 'w-volume', title: 'Read 5,000 words this week', description: 'Read 5,000 words this week.', target: 5000, unit: 'words', xp: 150 },
  { id: 'w-days', title: 'Read on 4 days this week', description: 'Read on four separate days this week.', target: 4, unit: 'days', xp: 150 },
  { id: 'w-comprehend', title: 'Score 70% or more on 3 quizzes this week', description: 'Score 70% or more on three quizzes.', target: 3, unit: 'quizzes', xp: 150 },
];

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function toDate(now) {
  if (now instanceof Date) return now;
  if (isNum(now)) return new Date(now);
  return new Date(NaN);
}

function localDayKey(ts) {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function daySerialFromDate(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfLocalWeek(date) {
  const start = startOfLocalDay(date);
  const offset = (start.getDay() + 6) % 7; // Monday-start
  start.setDate(start.getDate() - offset);
  return start;
}

function addDays(date, n) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + n);
  return next;
}

export function challengeFor(now, period) {
  const date = toDate(now);
  if (Number.isNaN(date.getTime())) return null;
  const serial = daySerialFromDate(date);
  if (period === 'weekly') {
    const weekIndex = Math.floor((serial + 3) / 7);
    return { ...WEEKLY[mod(weekIndex, 3)], period: 'weekly' };
  }
  return { ...DAILY[mod(serial, 3)], period: 'daily' };
}

function stateFor(entry, period, periodStart, periodEnd, current) {
  const value = isNum(current) ? Math.max(0, current) : 0;
  const pct = Math.min(100, Math.max(0, Math.round((value / entry.target) * 100)));
  return {
    id: entry.id,
    period,
    periodStart: periodStart.getTime(),
    periodEnd: periodEnd.getTime(),
    title: entry.title,
    target: entry.target,
    current: value,
    pct,
    complete: value >= entry.target,
    xp: entry.xp,
  };
}

export function challengeProgress({ sessions = [], quizzes = [] } = {}, { now } = {}) {
  const date = toDate(now);
  if (Number.isNaN(date.getTime())) return { daily: null, weekly: null };
  const list = Array.isArray(sessions) ? sessions : [];
  const quizList = Array.isArray(quizzes) ? quizzes : [];

  const dayStart = startOfLocalDay(date);
  const dayEnd = addDays(dayStart, 1);
  const weekStart = startOfLocalWeek(date);
  const weekEnd = addDays(weekStart, 7);
  const inWindow = (ts, start, end) => isNum(ts) && ts >= start.getTime() && ts < end.getTime();

  const daySessions = list.filter((s) => s && inWindow(s.startedAt, dayStart, dayEnd));
  const weekSessions = list.filter((s) => s && inWindow(s.startedAt, weekStart, weekEnd));

  const words = (arr) => arr.reduce((sum, s) => sum + (isNum(s.wordCount) ? Math.max(0, s.wordCount) : 0), 0);
  const focusMs = (arr) => arr.reduce((sum, s) => sum + (isNum(s.elapsedMs) ? Math.max(0, s.elapsedMs) : 0), 0);
  const scoredDay = daySessions.filter((s) => s.drill !== 'span' && isNum(s.comprehensionPct) && s.comprehensionPct >= 60).length;
  const distinctDays = new Set(weekSessions.filter((s) => isNum(s.startedAt)).map((s) => localDayKey(s.startedAt))).size;
  const drillQuizIds = new Set(list.filter((s) => s && s.drill === 'span' && s.quizId).map((s) => String(s.quizId)));
  const goodQuizzes = quizList.filter((q) => q && !drillQuizIds.has(String(q.id)) && inWindow(q.createdAt, weekStart, weekEnd) && q.score && isNum(q.score.pct) && q.score.pct >= 70).length;

  const daily = challengeFor(date, 'daily');
  const weekly = challengeFor(date, 'weekly');
  return {
    daily: stateFor(daily, 'daily', dayStart, dayEnd,
      daily.id === 'd-read' ? words(daySessions) : daily.id === 'd-focus' ? focusMs(daySessions) : scoredDay),
    weekly: stateFor(weekly, 'weekly', weekStart, weekEnd,
      weekly.id === 'w-volume' ? words(weekSessions) : weekly.id === 'w-days' ? distinctDays : goodQuizzes),
  };
}
