// Progress (Log) view + session summary state.
// Contract: createDashboard(root, {onStartSession, onExport, onImportJson, onAcceptWpm})
//   -> {render({sessions, quizzes, suggestion, summary, aggregate})}
// summary = null (log view) or {
//   session, textTitle, chapterTitle, baseline: {avgWpm, bestWpm} | null,
//   moments: [{type, priority, payload}], xpEarned, level: {name, progress, nextThreshold},
//   streak: {current, longest}, suggestion: number|null
// } (summary view, ADR-25 §19 order). One state renders at a time (binding 4).

import { h } from './h.js';
import { summarize, sessionTicks } from '../lib/metrics.js';
import { announce } from './a11y.js';
import { xpCard, streakCard, challengeCard, achievementGrid, unlockMoment } from './gamify-cards.js';
import { wpmChart, wordsBars, recordsList } from './gamify-viz.js';
import { personalRecords } from '../lib/records.js';
import { totalXp, levelFor } from '../lib/xp.js';
import { dayMap as buildDayMap, streakStats, dayKey } from '../lib/streak.js';
import { challengeProgress } from '../lib/challenges.js';
import { evaluate as evaluateAchievements, ACHIEVEMENTS } from '../lib/achievements.js';

export function createDashboard(root, { onStartSession, onExport, onImportJson, onAcceptWpm, onShowLog } = {}) {
  let lastTextId = null;
  let pendingSuggestion = null;
  let lastSummaryId = null;
  let lastSummary = null;
  let aggregate = 'recent';

  function suggestionCard(suggestion) {
    pendingSuggestion = typeof suggestion === 'number' && Number.isFinite(suggestion) ? suggestion : null;
    if (pendingSuggestion === null || pendingSuggestion <= 0) return null;
    const text = h('span', {}, `Suggested next target: ${pendingSuggestion} wpm `);
    const accept = h('button', {
      type: 'button',
      class: 'dashboard-accept-wpm',
      on: { click: () => { if (typeof pendingSuggestion === 'number') onAcceptWpm?.(pendingSuggestion); } },
    }, 'Accept');
    const dismiss = h('button', {
      type: 'button',
      class: 'dashboard-dismiss-wpm',
      on: { click: (e) => { e.target.closest('.dashboard-suggestion').hidden = true; } },
    }, 'Dismiss');
    return h('div', { class: 'dashboard-suggestion' }, text, accept, dismiss);
  }

  // ---- reward moments (ADR-24 priority order; role=status; dismissible; no focus theft) ----
  function momentText(m) {
    const p = m.payload ?? {};
    if (m.type === 'record') return `Record broken: ${p.recordId} — ${p.value}`;
    if (m.type === 'achievement') {
      const def = ACHIEVEMENTS.find((a) => a.id === p.achievementId);
      return `Achievement unlocked: ${def ? `${def.glyph} ${def.title}` : p.achievementId}`;
    }
    if (m.type === 'level') return `Level up: ${p.name}`;
    if (m.type === 'challenge') return `Challenge complete: ${p.challengeId}`;
    if (m.type === 'streak') return `${p.current}-day streak`;
    return m.type;
  }

  function momentNode(m, hero) {
    const node = h('div', {
      class: hero ? 'reward-moment reward-hero' : 'reward-moment',
      role: 'status',
      'aria-label': momentText(m),
    }, h('span', { class: 'reward-text' }, momentText(m)));
    node.append(h('button', {
      type: 'button',
      'aria-label': 'Dismiss reward',
      on: { click: () => node.remove() },
    }, 'Dismiss'));
    return node;
  }

  // ---- summary state (ADR-25 §19: exactly this order) ----
  function renderSummary(sum, sessions) {
    const s = sum.session;
    const wpm = Math.round(s.wpm ?? 0);
    const comp = s.comprehensionPct;
    const compText = typeof comp === 'number' ? `${Math.round(comp)}%` : '—';
    const mins = (s.elapsedMs / 60000).toFixed(1);

    const head = h('h2', { class: 'dashboard-summary-heading', tabindex: '-1' }, 'Session summary');
    const sub = h('p', { class: 'dashboard-summary-sub' }, `${sum.textTitle} — ${sum.chapterTitle}`);
    const hero = h('p', { class: 'dashboard-hero' },
      `${wpm} wpm · ${compText} comprehension · ${s.wordCount ?? 0} words · ${mins} min`);

    const base = sum.baseline ? h('p', { class: 'dashboard-baseline' },
      `vs your average ${Math.round(sum.baseline.avgWpm)} wpm (${wpm - Math.round(sum.baseline.avgWpm) >= 0 ? '+' : ''}${Math.round(wpm - sum.baseline.avgWpm)}), best ${Math.round(sum.baseline.bestWpm)} wpm`) : null;

    const moments = Array.isArray(sum.moments) ? sum.moments : [];
    // Reward-once hero: the first never-seen unlock renders as a dismissible
    // unlock moment; otherwise the top-priority moment leads (ADR-24 order).
    let heroMoment = null;
    if (sum.heroUnlock) {
      const def = ACHIEVEMENTS.find((a) => a.id === sum.heroUnlock);
      heroMoment = unlockMoment({ id: sum.heroUnlock, title: def?.title ?? sum.heroUnlock }) ?? momentNode(moments[0], true);
    } else if (moments.length > 0) {
      heroMoment = momentNode(moments[0], true);
    }
    const compact = moments.slice(1, 4).map((m) => momentNode(m, false));

    const lvl = sum.level;
    const xpLine = h('p', { class: 'dashboard-xp' },
      `${sum.xpEarned} XP earned · Level ${lvl.name} (${Math.round(lvl.progress * 100)}% to ${lvl.nextThreshold})`);
    const xpBar = h('div', {
      class: 'dashboard-xpbar', role: 'progressbar',
      'aria-valuenow': String(Math.round(lvl.progress * 100)),
      'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': 'Level progress',
    });

    const streakLine = h('p', { class: 'dashboard-streak' },
      sum.streak.current >= 2 ? `${sum.streak.current}-day streak (longest ${sum.streak.longest})` : 'No streak yet — read tomorrow to start one.');

    const recs = moments.filter((m) => m.type === 'record');
    const recLine = h('div', { class: 'dashboard-records-broken' },
      recs.length === 0 ? h('p', {}, 'No records broken this lap.') :
        h('ul', {}, ...recs.map((m) => h('li', {}, momentText(m)))));

    const achs = moments.filter((m) => m.type === 'achievement');
    const achLine = h('div', { class: 'dashboard-achievements-unlocked' },
      achs.length === 0 ? h('p', {}, 'No achievements this lap.') :
        h('ul', {}, ...achs.map((m) => h('li', {}, momentText(m)))));

    const next = h('div', { class: 'dashboard-next' },
      sum.suggestion ? suggestionCard(sum.suggestion) : h('p', {}, 'No target suggestion right now.'));
    const goLog = h('button', { type: 'button', on: { click: () => {
      if (onShowLog) onShowLog();
      else renderLog(lastLogArgs);
    } } }, 'Dashboard');
    const goNext = h('button', { type: 'button', on: { click: () => onStartSession?.(lastTextId) } }, 'Read next');
    const actions = h('div', { class: 'dashboard-summary-actions' }, goLog, goNext);

    root.replaceChildren(head, sub, hero, base, heroMoment, ...compact, xpLine, xpBar, streakLine, recLine, achLine, next, actions);
    // Focus + announcement happen in focusSummary(), called after routing
    // (show() refocuses the main landmark, so focusing here would lose).
  }

  function focusSummary() {
    const head = root.querySelector('.dashboard-summary-heading');
    if (!head) return false;
    head.focus();
    const s = lastSummary?.session;
    if (s && lastSummaryId !== s.id) {
      lastSummaryId = s.id;
      const wpm = Math.round(s.wpm ?? 0);
      const comp = typeof s.comprehensionPct === 'number' ? `${Math.round(s.comprehensionPct)}%` : '—';
      announce(`Session complete. ${wpm} wpm, ${comp} comprehension.`);
    }
    return true;
  }

  // ---- log view ----
  let lastLogArgs = { sessions: [], quizzes: [], suggestion: null };

  function lapRows(sessions) {
    const ticks = sessionTicks(sessions);
    return sessions.map((session, index) => {
      const previous = index > 0 ? sessions[index - 1] : null;
      const delta = previous && typeof session.wpm === 'number' && typeof previous.wpm === 'number'
        ? Math.round(session.wpm - previous.wpm)
        : null;
      const tick = ticks[index];
      const lapCell = h('td', { class: 'dashboard-lap' },
        `Lap ${index + 1}`,
        tick?.best ? h('span', { class: 'dashboard-best' }, ' · best') : null);
      const wpmCell = h('td', {}, typeof session.wpm === 'number' ? String(Math.round(session.wpm)) : '—');
      const compCell = h('td', {},
        typeof session.comprehensionPct === 'number' ? `${Math.round(session.comprehensionPct)}%` : '—');
      const deltaCell = h('td', { class: delta != null && delta >= 0 ? 'dashboard-delta-up' : 'dashboard-delta-down' },
        delta == null ? '—' : `${delta >= 0 ? '+' : ''}${delta}`);
      const kindCell = h('td', {}, (session.kind ?? 'read') + (session.drill === 'span' ? ' · span drill' : ''));
      const chunkCell = h('td', {},
        String(session.chunkSize ?? '—'),
        session.chunkSize === 3 ? h('span', { class: 'dashboard-experimental' }, ' (experimental)') : null);
      return h('tr', {}, lapCell, kindCell, chunkCell, wpmCell, compCell, deltaCell);
    });
  }

  function renderLog({ sessions = [], quizzes = [], suggestion = null } = {}) {
    lastLogArgs = { sessions, quizzes, suggestion };
    const stats = summarize(sessions);
    const avgComp = Math.round(stats.avgComprehension * 10) / 10;
    const heading = h('h2', { class: 'dashboard-heading' }, 'Progress');
    const summary = h('p', { class: 'dashboard-summary' }, sessions.length === 0
      ? 'No sessions yet.'
      : `${stats.sessions} sessions · best ${Math.round(stats.bestWpm)} wpm · avg ${Math.round(stats.avgWpm)} wpm · avg comprehension ${avgComp}% · trend ${stats.trend}`);

    const dm = buildDayMap(sessions);
    const total = totalXp(sessions, { dayMap: dm, challengeCompletions: [], recordImprovements: [], achievementUnlocks: [] });
    const statRow = h('div', { class: 'dashboard-statrow' },
      xpCard({ xp: total }),
      streakCard({ todayKey: dayKey(Date.now()), dayMap: dm }));

    const chal = challengeProgress({ sessions, quizzes }, { now: Date.now() });
    const chalProg = (c) => ({ current: c?.current ?? 0, target: c?.target ?? 1, pct: c?.pct ?? 0 });
    const challenges = h('div', { class: 'dashboard-challenges' },
      challengeCard({ title: chal.daily?.title ?? 'Daily challenge' }, chalProg(chal.daily)),
      challengeCard({ title: chal.weekly?.title ?? 'Weekly challenge' }, chalProg(chal.weekly)));

    const trends = sessions.length >= 4
      ? h('div', { class: 'dashboard-trends' },
          wpmChart(sessions, { maxPoints: 120, comprehension: true }),
          wordsBars(sessions, { days: 30 }))
      : h('p', { class: 'dashboard-trend-note' },
          sessions.length === 0 ? '' : 'Trend needs 4 sessions — keep reading.');

    const shown = aggregate === 'all' ? sessions : sessions.slice(-50);
    const toggle = sessions.length > 50 ? h('button', {
      type: 'button',
      class: 'dashboard-toggle',
      'aria-pressed': aggregate === 'all' ? 'true' : 'false',
      on: { click: () => { aggregate = aggregate === 'all' ? 'recent' : 'all'; renderLog(lastLogArgs); } },
    }, aggregate === 'all' ? 'Show recent 50' : 'Show all laps') : null;
    const table = h('table', { class: 'dashboard-table' },
      h('tr', {}, ...['Lap', 'Kind', 'Chunk', 'WPM', 'Comprehension', 'Δ wpm'].map((label) => h('th', {}, label))),
      ...lapRows(shown));

    const evaluated = evaluateAchievements(sessions, quizzes, {});
    const unlockedIds = evaluated.filter((a) => a.unlocked).map((a) => a.id);
    const recentUnlocks = evaluated.filter((a) => a.unlocked).sort((a, b) => b.unlockedAt - a.unlockedAt).slice(0, 3);
    const achSection = h('section', { class: 'card dashboard-section dashboard-achievements', 'aria-label': 'Achievements' },
      h('h3', {}, 'Achievements'),
      recentUnlocks.length === 0 ? h('p', {}, 'No achievements yet.') :
        h('ul', {}, ...recentUnlocks.map((a) => h('li', {}, `${a.glyph ?? ''} ${a.title}`.trim()))),
      achievementGrid(evaluated, unlockedIds));

    const recSection = h('section', { class: 'card dashboard-section dashboard-records', 'aria-label': 'Personal records' },
      h('h3', {}, 'Personal records'),
      recordsList(personalRecords(sessions, { dayMap: dm })));

    const importCta = h('button', { type: 'button', on: { click: () => onStartSession?.(null) } }, 'Import a text');
    const empty = h('p', { class: 'dashboard-empty' },
      'No sessions yet. Import a text and run a baseline to begin. ', importCta);

    const startBtn = h('button', {
      type: 'button',
      on: { click: () => onStartSession?.(lastTextId) },
    }, 'Start session');
    const exportBtn = h('button', { type: 'button', on: { click: () => onExport?.() } }, 'Export data');
    const importInput = h('input', {
      type: 'file',
      accept: '.json,application/json',
      class: 'dashboard-import',
    });
    importInput.addEventListener('change', async () => {
      const file = importInput.files ? importInput.files[0] : null;
      importInput.value = '';
      if (!file) return;
      try {
        onImportJson?.(JSON.parse(await file.text()));
      } catch (error) {
        summary.textContent = `Import failed: ${error.message}`;
      }
    });
    const importLabel = h('label', {}, 'Import data', importInput);
    const actions = h('div', { class: 'dashboard-actions' }, startBtn, exportBtn, importLabel);

    for (const session of sessions) if (session.textId) lastTextId = session.textId;
    startBtn.disabled = lastTextId === null;

    const kids = [heading, summary, statRow];
    const sugg = suggestionCard(suggestion);
    if (sugg) kids.push(sugg);
    kids.push(h('section', { class: 'card dashboard-section', 'aria-label': 'Challenges' }, challenges));
    if (sessions.length === 0) {
      kids.push(h('section', { class: 'card dashboard-section' }, empty));
    } else {
      kids.push(h('section', { class: 'card dashboard-section', 'aria-label': 'Trends' }, trends));
      if (toggle) kids.push(toggle);
      kids.push(h('section', { class: 'card dashboard-section', 'aria-label': 'Recent laps' }, table));
    }
    kids.push(achSection, recSection, actions);
    root.replaceChildren(...kids);
  }

  function render({ sessions = [], quizzes = [], suggestion = null, summary = null } = {}) {
    lastSummary = summary && summary.session ? summary : null;
    if (lastSummary) renderSummary(lastSummary, sessions);
    else renderLog({ sessions, quizzes, suggestion });
  }

  return { render, focusSummary };
}
