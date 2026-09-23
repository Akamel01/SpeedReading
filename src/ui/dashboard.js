// Progress dashboard: sessions summary, trend, experimental label, explicit-accept WPM suggestion.
// Contract: createDashboard(root, {onStartSession, onExport, onImportJson, onAcceptWpm})
//   -> {render({sessions, suggestion})}

import { summarize } from '../lib/metrics.js';

export function createDashboard(root, { onStartSession, onExport, onImportJson, onAcceptWpm } = {}) {
  const heading = document.createElement('h2');
  heading.className = 'dashboard-heading';
  heading.textContent = 'Progress';

  const summary = document.createElement('p');
  summary.className = 'dashboard-summary';

  const suggestionCard = document.createElement('div');
  suggestionCard.className = 'dashboard-suggestion';
  suggestionCard.hidden = true;
  const suggestionText = document.createElement('span');
  const acceptBtn = document.createElement('button');
  acceptBtn.type = 'button';
  acceptBtn.textContent = 'Accept';
  acceptBtn.className = 'dashboard-accept-wpm';
  suggestionCard.append(suggestionText, acceptBtn);

  const table = document.createElement('table');
  table.className = 'dashboard-table';

  const empty = document.createElement('p');
  empty.className = 'dashboard-empty';
  empty.textContent = 'No sessions yet. Import a text and run a baseline to begin.';

  const actions = document.createElement('div');
  actions.className = 'dashboard-actions';
  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.textContent = 'Start session';
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.textContent = 'Export data';
  const importLabel = document.createElement('label');
  importLabel.textContent = 'Import data';
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.json,application/json';
  importInput.className = 'dashboard-import';
  importLabel.appendChild(importInput);
  actions.append(startBtn, exportBtn, importLabel);

  root.replaceChildren(heading, summary, suggestionCard, table, empty, actions);

  startBtn.addEventListener('click', () => onStartSession?.(lastTextId));
  exportBtn.addEventListener('click', () => onExport?.());
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      onImportJson?.(json);
    } catch (error) {
      summary.textContent = `Import failed: ${error.message}`;
    }
  });
  acceptBtn.addEventListener('click', () => {
    if (typeof pendingSuggestion === 'number') onAcceptWpm?.(pendingSuggestion);
    suggestionCard.hidden = true;
  });

  let lastTextId = null;
  let pendingSuggestion = null;

  function renderSessions(sessions) {
    table.replaceChildren();
    if (sessions.length === 0) {
      table.hidden = true;
      empty.hidden = false;
      return;
    }
    table.hidden = false;
    empty.hidden = true;
    const head = document.createElement('tr');
    for (const label of ['Date', 'Kind', 'Chunk', 'WPM', 'Comprehension']) {
      const th = document.createElement('th');
      th.textContent = label;
      head.appendChild(th);
    }
    table.appendChild(head);
    for (const session of sessions) {
      const row = document.createElement('tr');
      const date = document.createElement('td');
      date.textContent = session.startedAt ? new Date(session.startedAt).toLocaleDateString() : '—';
      const kind = document.createElement('td');
      kind.textContent = session.kind ?? 'read';
      const chunk = document.createElement('td');
      chunk.textContent = String(session.chunkSize ?? '—');
      if (session.chunkSize === 3) {
        const badge = document.createElement('span');
        badge.className = 'dashboard-experimental';
        badge.textContent = ' (experimental)';
        chunk.appendChild(badge);
      }
      const wpmCell = document.createElement('td');
      wpmCell.textContent = typeof session.wpm === 'number' ? String(Math.round(session.wpm)) : '—';
      const comp = document.createElement('td');
      comp.textContent = typeof session.comprehensionPct === 'number'
        ? `${Math.round(session.comprehensionPct)}%`
        : '—';
      row.append(date, kind, chunk, wpmCell, comp);
      table.appendChild(row);
      if (session.textId) lastTextId = session.textId;
    }
  }

  function render({ sessions = [], suggestion = null } = {}) {
    const stats = summarize(sessions);
    const avgComp = Math.round(stats.avgComprehension * 10) / 10;
    summary.textContent = sessions.length === 0
      ? 'No sessions yet.'
      : `${stats.sessions} sessions · best ${Math.round(stats.bestWpm)} wpm · avg ${Math.round(stats.avgWpm)} wpm · avg comprehension ${avgComp}% · trend ${stats.trend}`;
    renderSessions(sessions);
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
