// Progress (Log) view.
// Contract: createDashboard(root, {onStartSession, onExport, onImportJson, onAcceptWpm})
//   -> {render({sessions, suggestion})}
// S5: lap rows ("Lap N", paired WPM/comprehension/delta, best marker) built with h().

import { h } from './h.js';
import { summarize, sessionTicks } from '../lib/metrics.js';

export function createDashboard(root, { onStartSession, onExport, onImportJson, onAcceptWpm } = {}) {
  const summary = h('p', { class: 'dashboard-summary' });
  const suggestionText = h('span', {});
  const acceptBtn = h('button', {
    type: 'button',
    class: 'dashboard-accept-wpm',
    on: { click: () => {
      if (typeof pendingSuggestion === 'number') onAcceptWpm?.(pendingSuggestion);
      suggestionCard.hidden = true;
    } },
  }, 'Accept');
  const dismissBtn = h('button', {
    type: 'button',
    class: 'dashboard-dismiss-wpm',
    on: { click: () => { suggestionCard.hidden = true; } },
  }, 'Dismiss');
  const suggestionCard = h('div', { class: 'dashboard-suggestion', hidden: 'true' }, suggestionText, ' ', acceptBtn, dismissBtn);

  const table = h('table', { class: 'dashboard-table' });
  const empty = h('p', { class: 'dashboard-empty' }, 'No sessions yet. Import a text and run a baseline to begin.');

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

  const heading = h('h2', { class: 'dashboard-heading' }, 'Progress');
  root.replaceChildren(heading, summary, suggestionCard, table, empty, actions);

  let lastTextId = null;
  let pendingSuggestion = null;

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

  function render({ sessions = [], suggestion = null } = {}) {
    const stats = summarize(sessions);
    const avgComp = Math.round(stats.avgComprehension * 10) / 10;
    summary.textContent = sessions.length === 0
      ? 'No sessions yet.'
      : `${stats.sessions} sessions · best ${Math.round(stats.bestWpm)} wpm · avg ${Math.round(stats.avgWpm)} wpm · avg comprehension ${avgComp}% · trend ${stats.trend}`;

    if (sessions.length === 0) {
      table.hidden = true;
      table.replaceChildren();
      empty.hidden = false;
    } else {
      table.hidden = false;
      empty.hidden = true;
      table.replaceChildren(
        h('tr', {},
          ...['Lap', 'Kind', 'Chunk', 'WPM', 'Comprehension', 'Δ wpm'].map((label) => h('th', {}, label))),
        ...lapRows(sessions));
      lastTextId = null;
      for (const session of sessions) if (session.textId) lastTextId = session.textId;
    }

    pendingSuggestion = typeof suggestion === 'number' && Number.isFinite(suggestion) ? suggestion : null;
    if (pendingSuggestion !== null && pendingSuggestion > 0) {
      suggestionText.textContent = `Suggested next target: ${pendingSuggestion} wpm `;
      suggestionCard.hidden = false;
    } else {
      suggestionCard.hidden = true;
    }
    startBtn.disabled = lastTextId === null;
  }

  return { render };
}
