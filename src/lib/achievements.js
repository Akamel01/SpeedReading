// src/lib/achievements.js — 26-entry catalog + evaluator (ADR-24). Pure; no clock.
// `evaluate` derives everything from session/quiz history; `today` and `streakStats`
// are injected. Drill sessions never unlock comprehension or speed stamps.

export const ACHIEVEMENTS = [
  { id: 'first-session', title: 'First entry', category: 'getting-started', rarity: 'common', requirement: 'Record one reading session', hidden: false, glyph: '1st' },
  { id: 'first-quiz', title: 'First check', category: 'getting-started', rarity: 'common', requirement: 'Complete one comprehension quiz', hidden: false, glyph: 'Q1' },
  { id: 'sessions-10', title: 'Ten laps', category: 'volume', rarity: 'common', requirement: 'Record 10 reading sessions', hidden: false, glyph: '10' },
  { id: 'sessions-25', title: 'Twenty-five laps', category: 'volume', rarity: 'uncommon', requirement: 'Record 25 reading sessions', hidden: false, glyph: '25' },
  { id: 'sessions-100', title: 'One hundred laps', category: 'volume', rarity: 'rare', requirement: 'Record 100 reading sessions', hidden: false, glyph: '100' },
  { id: 'sessions-250', title: 'Two hundred fifty laps', category: 'volume', rarity: 'epic', requirement: 'Record 250 reading sessions', hidden: false, glyph: '250' },
  { id: 'words-10k', title: 'Ten thousand words', category: 'volume', rarity: 'common', requirement: 'Read 10,000 words across sessions', hidden: false, glyph: '10k' },
  { id: 'words-100k', title: 'Hundred thousand words', category: 'volume', rarity: 'uncommon', requirement: 'Read 100,000 words across sessions', hidden: false, glyph: '100k' },
  { id: 'words-1m', title: 'One million words', category: 'volume', rarity: 'epic', requirement: 'Read 1,000,000 words across sessions', hidden: false, glyph: '1M' },
  { id: 'streak-3', title: 'Three-day rhythm', category: 'consistency', rarity: 'common', requirement: 'Read on 3 consecutive local days', hidden: false, glyph: '3d' },
  { id: 'streak-7', title: 'Seven-day rhythm', category: 'consistency', rarity: 'uncommon', requirement: 'Read on 7 consecutive local days', hidden: false, glyph: '7d' },
  { id: 'streak-30', title: 'Thirty-day rhythm', category: 'consistency', rarity: 'rare', requirement: 'Read on 30 consecutive local days', hidden: false, glyph: '30d' },
  { id: 'streak-100', title: 'Hundred-day rhythm', category: 'consistency', rarity: 'epic', requirement: 'Read on 100 consecutive local days', hidden: false, glyph: '100d' },
  { id: 'five-of-seven', title: 'Five of seven', category: 'consistency', rarity: 'uncommon', requirement: 'Read on 5 days within one calendar week', hidden: false, glyph: '5/7' },
  { id: 'comeback', title: 'The return', category: 'consistency', rarity: 'uncommon', requirement: 'Read again ≥14 days after your previous session', hidden: true, glyph: 'ret' },
  { id: 'comprehension-80', title: 'Eighty percent', category: 'comprehension', rarity: 'uncommon', requirement: 'Score ≥80% on one quiz', hidden: false, glyph: '80%' },
  { id: 'comprehension-90', title: 'Ninety percent', category: 'comprehension', rarity: 'rare', requirement: 'Score ≥90% on one quiz', hidden: false, glyph: '90%' },
  { id: 'perfect-quiz', title: 'Clean sweep', category: 'comprehension', rarity: 'epic', requirement: 'Score 100% on one quiz', hidden: false, glyph: '100%' },
  { id: 'wpm-300', title: 'Three hundred', category: 'speed', rarity: 'uncommon', requirement: 'Reach 300 wpm with ≥80% comprehension that session', hidden: false, glyph: '300' },
  { id: 'wpm-450', title: 'Four fifty', category: 'speed', rarity: 'rare', requirement: 'Reach 450 wpm with ≥80% comprehension that session', hidden: false, glyph: '450' },
  { id: 'wpm-600', title: 'Six hundred', category: 'speed', rarity: 'epic', requirement: 'Reach 600 wpm with ≥80% comprehension that session', hidden: false, glyph: '600' },
  { id: 'first-record', title: 'Personal best', category: 'records', rarity: 'uncommon', requirement: 'Improve a WPM personal record (scored, ≥60%)', hidden: false, glyph: 'PB' },
  { id: 'sustained-improvement', title: 'Sustained climb', category: 'records', rarity: 'rare', requirement: '3 scored sessions in a row, wpm non-decreasing, comprehension ≥70% each', hidden: false, glyph: 'up' },
  { id: 'marathon', title: 'Long session', category: 'records', rarity: 'rare', requirement: 'Read ≥45 minutes in one session', hidden: true, glyph: '45m' },
  { id: 'texts-5', title: 'Across the shelf', category: 'exploration', rarity: 'uncommon', requirement: 'Read from 5 different texts', hidden: false, glyph: '5x' },
  { id: 'drill-master', title: 'Calibration practice', category: 'exploration', rarity: 'common', requirement: 'Complete 10 span-drill sessions', hidden: false, glyph: '10x' },
];

const MARATHON_MS = 45 * 60 * 1000;
const DAY_MS = 86400000;

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function localDayKey(ts) {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function serialFromKey(key) {
  const p = String(key).split('-').map(Number);
  if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return NaN;
  return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / DAY_MS);
}

function valid(s) {
  return s && typeof s === 'object' && isNum(s.endedAt);
}

function chronological(sessions) {
  return sessions.filter(valid).slice().sort((a, b) => a.endedAt - b.endedAt);
}

function localLongestStreak(sessions) {
  const serials = [...new Set(sessions.filter(valid).map((s) => serialFromKey(localDayKey(s.startedAt ?? s.endedAt))))]
    .filter(isNum)
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = null;
  for (const s of serials) {
    run = prev !== null && s === prev + 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = s;
  }
  return best;
}

function weekDaysMax(sessions) {
  const weeks = new Map();
  for (const s of sessions.filter(valid)) {
    const serial = serialFromKey(localDayKey(s.startedAt ?? s.endedAt));
    if (!isNum(serial)) continue;
    const week = Math.floor((serial + 3) / 7);
    if (!weeks.has(week)) weeks.set(week, new Set());
    weeks.get(week).add(serial);
  }
  let best = 0;
  for (const days of weeks.values()) if (days.size > best) best = days.size;
  return best;
}

function countProgress(current, target, unlockedAt) {
  const value = Math.max(0, Math.min(current, target));
  return {
    unlocked: unlockedAt !== null && unlockedAt !== undefined,
    unlockedAt: unlockedAt ?? null,
    progress: { current: value, target, pct: Math.round((value / target) * 100) },
  };
}

function flagProgress(unlockedAt) {
  const unlocked = unlockedAt !== null && unlockedAt !== undefined;
  return { unlocked, unlockedAt: unlockedAt ?? null, progress: { current: unlocked ? 1 : 0, target: 1, pct: unlocked ? 100 : 0 } };
}

export function evaluate(sessions = [], quizzes = [], options = {}) {
  const { streakStats } = options ?? {};
  const all = Array.isArray(sessions) ? sessions.filter((s) => s && typeof s === 'object') : [];
  const drillQuizIds = new Set(all.filter((s) => s.drill === 'span' && s.quizId).map((s) => String(s.quizId)));
  const quizList = (Array.isArray(quizzes) ? quizzes : [])
    .filter((q) => q && typeof q === 'object' && !drillQuizIds.has(String(q.id)));
  const byEnd = chronological(all);
  const scored = byEnd.filter((s) => s.drill !== 'span' && isNum(s.comprehensionPct) && s.comprehensionPct >= 60 && isNum(s.wpm));

  const sessionCount = all.length;
  const words = all.reduce((sum, s) => sum + (isNum(s.wordCount) ? Math.max(0, s.wordCount) : 0), 0);
  const quizCount = quizList.length;
  const quizById = new Map(quizList.map((q) => [String(q.id), q]));
  const quizPcts = quizList
    .filter((q) => q.score && isNum(q.score.pct))
    .map((q) => ({ pct: q.score.pct, at: isNum(q.createdAt) ? q.createdAt : null }))
    .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity));
  const effectivePct = (s) => {
    if (isNum(s.comprehensionPct)) return s.comprehensionPct;
    const q = s.quizId !== undefined && s.quizId !== null ? quizById.get(String(s.quizId)) : null;
    return q && q.score && isNum(q.score.pct) ? q.score.pct : null;
  };
  const longestStreak = streakStats && isNum(streakStats.longest) ? streakStats.longest : localLongestStreak(all);

  // Timestamp of the event that first reached N consecutive days.
  const streakCrossingAt = (n) => {
    const dayAt = new Map();
    for (const s of byEnd) {
      const serial = serialFromKey(localDayKey(s.startedAt ?? s.endedAt));
      if (!isNum(serial)) continue;
      if (!dayAt.has(serial)) dayAt.set(serial, s.endedAt);
    }
    const serials = [...dayAt.keys()].sort((a, b) => a - b);
    let run = 0;
    let prev = null;
    for (const serial of serials) {
      run = prev !== null && serial === prev + 1 ? run + 1 : 1;
      prev = serial;
      if (run >= n) return dayAt.get(serial);
    }
    return null;
  };

  const nthAt = (list, n) => (list.length >= n ? list[n - 1].endedAt : null);
  const milestoneAt = (target) => {
    let sum = 0;
    for (const s of byEnd) {
      sum += isNum(s.wordCount) ? Math.max(0, s.wordCount) : 0;
      if (sum >= target) return s.endedAt;
    }
    return null;
  };

  const distinctTextsAt = (n) => {
    const seen = new Set();
    for (const s of byEnd) {
      if (s.textId !== undefined && s.textId !== null) seen.add(String(s.textId));
      if (seen.size >= n) return s.endedAt;
    }
    return null;
  };

  const drills = byEnd.filter((s) => s.drill === 'span');
  const fiveOfSeven = weekDaysMax(all);
  const fiveOfSevenAt = fiveOfSeven >= 5 ? (() => {
    const weeks = new Map();
    for (const s of byEnd) {
      const serial = serialFromKey(localDayKey(s.startedAt ?? s.endedAt));
      if (!isNum(serial)) continue;
      const week = Math.floor((serial + 3) / 7);
      if (!weeks.has(week)) weeks.set(week, new Set());
      weeks.get(week).add(serial);
      if (weeks.get(week).size >= 5) return s.endedAt;
    }
    return null;
  })() : null;

  const daySerials = [...new Set(all.filter(valid).map((s) => serialFromKey(localDayKey(s.startedAt ?? s.endedAt))))].filter(isNum).sort((a, b) => a - b);
  let comebackAt = null;
  for (let i = 1; i < daySerials.length; i++) {
    if (daySerials[i] - daySerials[i - 1] >= 14) {
      const serial = daySerials[i];
      const hit = byEnd.find((s) => serialFromKey(localDayKey(s.startedAt ?? s.endedAt)) === serial);
      comebackAt = hit ? hit.endedAt : null;
      break;
    }
  }

  const firstAt = (predicate) => {
    for (const s of byEnd) if (predicate(s)) return s.endedAt;
    return null;
  };

  const bestPctAt = (threshold) => firstAt((s) => s.drill !== 'span' && effectivePct(s) !== null && effectivePct(s) >= threshold);
  const quizAt = (threshold) => {
    const hit = quizPcts.find((q) => q.pct >= threshold);
    return hit ? hit.at : null;
  };
  const wpmAt = (threshold) => firstAt((s) => s.drill !== 'span' && isNum(s.comprehensionPct) && s.comprehensionPct >= 80 && isNum(s.wpm) && s.wpm >= threshold);

  let firstRecordAt = null;
  let best = null;
  for (const s of scored) {
    if (best !== null && s.wpm > best) { firstRecordAt = s.endedAt; break; }
    if (best === null || s.wpm > best) best = s.wpm;
  }

  let sustainedAt = null;
  let run = 0;
  let prevWpm = null;
  for (const s of byEnd) {
    const eligible = s.drill !== 'span' && isNum(s.comprehensionPct) && s.comprehensionPct >= 70 && isNum(s.wpm);
    if (!eligible) { run = 0; prevWpm = null; continue; }
    if (prevWpm === null || s.wpm >= prevWpm) run += 1;
    else run = 1;
    prevWpm = s.wpm;
    if (run >= 3) { sustainedAt = s.endedAt; break; }
  }

  const marathonAt = firstAt((s) => isNum(s.elapsedMs) && s.elapsedMs >= MARATHON_MS);

  const facts = {
    'first-session': countProgress(sessionCount, 1, nthAt(byEnd, 1)),
    'first-quiz': countProgress(quizCount, 1, quizPcts.length ? quizPcts[0].at : null),
    'sessions-10': countProgress(sessionCount, 10, nthAt(byEnd, 10)),
    'sessions-25': countProgress(sessionCount, 25, nthAt(byEnd, 25)),
    'sessions-100': countProgress(sessionCount, 100, nthAt(byEnd, 100)),
    'sessions-250': countProgress(sessionCount, 250, nthAt(byEnd, 250)),
    'words-10k': countProgress(words, 10000, milestoneAt(10000)),
    'words-100k': countProgress(words, 100000, milestoneAt(100000)),
    'words-1m': countProgress(words, 1000000, milestoneAt(1000000)),
    'streak-3': countProgress(longestStreak, 3, streakCrossingAt(3) ?? (longestStreak >= 3 ? nthAt(byEnd, 1) : null)),
    'streak-7': countProgress(longestStreak, 7, streakCrossingAt(7) ?? (longestStreak >= 7 ? nthAt(byEnd, 1) : null)),
    'streak-30': countProgress(longestStreak, 30, streakCrossingAt(30) ?? (longestStreak >= 30 ? nthAt(byEnd, 1) : null)),
    'streak-100': countProgress(longestStreak, 100, streakCrossingAt(100) ?? (longestStreak >= 100 ? nthAt(byEnd, 1) : null)),
    'five-of-seven': countProgress(fiveOfSeven, 5, fiveOfSevenAt),
    comeback: flagProgress(comebackAt),
    'comprehension-80': flagProgress(bestPctAt(80)),
    'comprehension-90': flagProgress(bestPctAt(90)),
    'perfect-quiz': flagProgress(quizAt(100)),
    'wpm-300': flagProgress(wpmAt(300)),
    'wpm-450': flagProgress(wpmAt(450)),
    'wpm-600': flagProgress(wpmAt(600)),
    'first-record': flagProgress(firstRecordAt),
    'sustained-improvement': flagProgress(sustainedAt),
    marathon: flagProgress(marathonAt),
    'texts-5': countProgress(new Set(all.map((s) => s.textId).filter((v) => v !== undefined && v !== null && v !== '')).size, 5, distinctTextsAt(5)),
    'drill-master': countProgress(drills.length, 10, nthAt(drills, 10)),
  };

  return ACHIEVEMENTS.map((def) => {
    const fact = facts[def.id] ?? flagProgress(null);
    return { ...def, unlocked: fact.unlocked, unlockedAt: fact.unlockedAt, progress: fact.progress };
  });
}
