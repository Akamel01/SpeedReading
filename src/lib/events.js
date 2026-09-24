// src/lib/events.js — pure event projection (ADR-22). No DOM, no clock.
// facts(): append-only history projected as typed events with unique keys.
// rewardMoments(): all historical reward moments, priority-ordered.
// sessionMoments(): only the moments attributable to one completed session.

import { totalXp, levelFor } from './xp.js';
import { dayMap as buildDayMap, streakStats, dayKey } from './streak.js';
import { evaluate as evaluateAchievements } from './achievements.js';
import { challengeProgress } from './challenges.js';
import { recordImprovements } from './records.js';

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function hasId(rec) {
  return rec && typeof rec === 'object' && rec.id !== undefined && rec.id !== null;
}

export function facts({ sessions = [], quizzes = [] } = {}) {
  const list = Array.isArray(sessions) ? sessions : [];
  const qList = Array.isArray(quizzes) ? quizzes : [];
  const byKey = new Map();

  for (const s of list) {
    if (!hasId(s) || !isNum(s.endedAt)) continue;
    byKey.set(`session:${s.id}`, {
      type: 'session.completed',
      at: s.endedAt,
      key: `session:${s.id}`,
      sessionId: String(s.id),
      payload: {
        sessionId: String(s.id),
        textId: s.textId ?? null,
        chapterIndex: isNum(s.chapterIndex) ? s.chapterIndex : null,
        kind: s.kind ?? null,
        chunkSize: isNum(s.chunkSize) ? s.chunkSize : null,
        targetWpm: isNum(s.targetWpm) ? s.targetWpm : null,
        wordCount: isNum(s.wordCount) ? s.wordCount : 0,
        elapsedMs: isNum(s.elapsedMs) ? s.elapsedMs : null,
        wpm: isNum(s.wpm) ? s.wpm : null,
        comprehensionPct: isNum(s.comprehensionPct) ? s.comprehensionPct : null,
        drill: s.drill ?? null,
      },
    });
  }

  for (const q of qList) {
    if (!hasId(q) || !isNum(q.createdAt)) continue;
    const linked = list.find((s) => hasId(s) && s.quizId !== undefined && s.quizId !== null && String(s.quizId) === String(q.id));
    if (!linked) continue;
    const key = `quiz:${linked.id}`;
    byKey.set(key, {
      type: 'session.quiz_completed',
      at: q.createdAt,
      key,
      sessionId: String(linked.id),
      payload: {
        sessionId: String(linked.id),
        quizId: q.id,
        correct: q.score && isNum(q.score.correct) ? q.score.correct : null,
        total: q.score && isNum(q.score.total) ? q.score.total : null,
        pct: q.score && isNum(q.score.pct) ? q.score.pct : null,
        edited: q.edited === true,
      },
    });
  }

  return [...byKey.values()].sort((a, b) => (a.at - b.at) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

export function rewardMoments({ sessions = [], quizzes = [], today } = {}) {
  const list = (Array.isArray(sessions) ? sessions : []).filter((s) => s && typeof s === 'object');
  const qList = Array.isArray(quizzes) ? quizzes : [];
  const dm = buildDayMap(list);
  const moments = [];

  for (const imp of recordImprovements(list, { dayMap: dm })) {
    if (!imp || !isNum(imp.at)) continue;
    moments.push({
      type: 'record',
      at: imp.at,
      key: `record:${imp.id}:${imp.at}`,
      priority: 1,
      payload: { recordId: imp.id, value: imp.value, previous: imp.previous ?? null, sessionId: imp.sessionId ?? null, day: imp.day ?? null },
    });
  }

  const achievements = evaluateAchievements(list, qList, {});
  for (const a of achievements) {
    if (!a || !a.unlocked || !isNum(a.unlockedAt)) continue;
    const crossing = list.find((s) => isNum(s.endedAt) && s.endedAt === a.unlockedAt);
    moments.push({
      type: 'achievement',
      at: a.unlockedAt,
      key: `achievement:${a.id}`,
      priority: 2,
      payload: { achievementId: a.id, sessionId: crossing && hasId(crossing) ? String(crossing.id) : null },
    });
  }

  // Level-ups: cumulative XP (sessions + streak + bonuses earned so far) in chronological order.
  const ordered = list.filter((s) => isNum(s.endedAt)).slice().sort((a, b) => a.endedAt - b.endedAt);
  const improvements = recordImprovements(list, { dayMap: dm });
  const unlocks = achievements.filter((a) => a && a.unlocked && isNum(a.unlockedAt)).map((a) => ({ id: a.id, at: a.unlockedAt }));
  let prevLevel = levelFor(0).index;
  const cumulative = [];
  for (const s of ordered) {
    cumulative.push(s);
    const prefix = { dayMap: buildDayMap(cumulative) };
    const xp = totalXp(cumulative, {
      ...prefix,
      challengeCompletions: [],
      recordImprovements: improvements.filter((i) => isNum(i.at) && i.at <= s.endedAt),
      achievementUnlocks: unlocks.filter((u) => u.at <= s.endedAt),
    });
    const level = levelFor(xp);
    if (level.index > prevLevel) {
      moments.push({
        type: 'level',
        at: s.endedAt,
        key: `level:${level.index}`,
        priority: 3,
        payload: { index: level.index, name: level.name, xp },
      });
      prevLevel = level.index;
    }
  }

  // Challenges: the current period's completion, derived (no stored state).
  if (isNum(today)) {
    const { daily, weekly } = challengeProgress({ sessions: list, quizzes: qList }, { now: today });
    for (const state of [daily, weekly]) {
      if (!state || !state.complete) continue;
      const inPeriod = ordered.filter((s) => isNum(s.endedAt) && s.endedAt >= state.periodStart && s.endedAt < state.periodEnd);
      const at = inPeriod.length ? inPeriod[inPeriod.length - 1].endedAt : state.periodEnd;
      moments.push({
        type: 'challenge',
        at,
        key: `challenge:${state.id}:${state.periodStart}`,
        priority: 4,
        payload: { challengeId: state.id, period: state.period, periodStart: state.periodStart, xp: state.xp },
      });
    }
  }

  // Streak update: the latest run's most recent day.
  const stats = streakStats(dm, isNum(today) ? dayKey(today) : null);
  if (stats.current >= 2 && stats.lastDay) {
    const lastOfRun = ordered.filter((s) => dayKey(s.startedAt ?? s.endedAt) === stats.lastDay).pop();
    if (lastOfRun) {
      moments.push({
        type: 'streak',
        at: lastOfRun.endedAt,
        key: `streak:${stats.lastDay}`,
        priority: 5,
        payload: { day: stats.lastDay, current: stats.current, longest: stats.longest },
      });
    }
  }

  return moments.sort((a, b) => (a.priority - b.priority) || (a.at - b.at) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

export function sessionMoments({ sessions = [], quizzes = [], today, sessionId } = {}) {
  if (sessionId === undefined || sessionId === null) return [];
  const list = (Array.isArray(sessions) ? sessions : []).filter((s) => s && typeof s === 'object');
  const qList = Array.isArray(quizzes) ? quizzes : [];
  const target = list.find((s) => hasId(s) && String(s.id) === String(sessionId));
  if (!target || !isNum(target.endedAt)) return [];
  const targetDay = dayKey(target.startedAt ?? target.endedAt);
  const linkedQuiz = target.quizId !== undefined && target.quizId !== null
    ? qList.find((q) => q && hasId(q) && String(q.id) === String(target.quizId))
    : null;
  const quizAt = linkedQuiz && isNum(linkedQuiz.createdAt) ? linkedQuiz.createdAt : null;
  return rewardMoments({ sessions: list, quizzes: qList, today }).filter((m) => {
    const p = m.payload ?? {};
    if (p.sessionId !== undefined && p.sessionId !== null) return String(p.sessionId) === String(sessionId);
    if (p.day !== undefined && p.day !== null) return p.day === targetDay;
    return m.at === target.endedAt || (quizAt !== null && m.at === quizAt);
  });
}
