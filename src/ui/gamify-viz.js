// Gamification viz module
// Exports three pure-render helpers built with the shared `h()` helper.
// Import path expectations:
// - h() from './h.js'
// - personalRecords, RECORD_IDS from '../lib/records.js'

import {h} from './h.js';
import {personalRecords, RECORD_IDS} from '../lib/records.js';

// Helpers -----------------------------------------------------------------
// Local day key (ADR-24 I4 convention: local, zero-padded) and Monday-start week key.
function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function weekKey(ts) {
  const d = new Date(ts);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}
function mean(nums) {
  const xs = nums.filter((n) => Number.isFinite(n));
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

// Buckets sessions per ADR-25: raw when ≤ maxPoints, else day buckets when
// distinct days ≤ maxPoints, else Monday-start week buckets. Chronological, deterministic.
function bucketWpm(sessions, maxPoints) {
  if (!Array.isArray(sessions) || sessions.length === 0) return [];
  const arr = sessions.slice().sort((a, b) => a.endedAt - b.endedAt);
  if (arr.length <= maxPoints) {
    return arr.map((s) => ({
      label: dayKey(s.endedAt),
      value: Number(s.wpm) || 0,
      comp: Number.isFinite(Number(s.comprehensionPct)) ? Number(s.comprehensionPct) : null,
    }));
  }
  const byDay = new Map();
  for (const s of arr) {
    const key = dayKey(s.endedAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(s);
  }
  if (byDay.size <= maxPoints) {
    return [...byDay.entries()].map(([key, xs]) => {
      const comps = xs.map((x) => x.comprehensionPct).filter((n) => Number.isFinite(Number(n))).map(Number);
      return {
        label: key,
        value: mean(xs.map((x) => Number(x.wpm))),
        comp: comps.length > 0 ? mean(comps) : null,
      };
    });
  }
  const byWeek = new Map();
  for (const s of arr) {
    const key = weekKey(s.endedAt);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key).push(s);
  }
  return [...byWeek.entries()].map(([key, xs]) => {
    const comps = xs.map((x) => x.comprehensionPct).filter((n) => Number.isFinite(Number(n))).map(Number);
    return {
      label: `w/c ${key}`,
      value: mean(xs.map((x) => Number(x.wpm))),
      comp: comps.length > 0 ? mean(comps) : null,
    };
  });
}

// Public API ---------------------------------------------------------------
export function wpmChart(sessions, { maxPoints = 120, comprehension = false } = {}) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return h('div', { class: 'viz-empty', 'aria-live': 'polite' }, 'No sessions yet');
  }

  const points = bucketWpm(sessions, maxPoints);
  const showComp = comprehension === true && points.some((p) => typeof p.comp === 'number');
  const wpmMax = Math.max(1, ...points.map(p => p.value));
  const wpmMin = 0;

  const w = 800; // viewBox width
  const hGT = 180; // chart height in px
  const v = {w, h: 200};
  const step = points.length > 1 ? w / (points.length - 1) : 0;

  // Build path data for line chart
  let pathD = '';
  const pts = points.map((p, i) => {
    const x = i * (step || 0);
    const y = wpmMax === wpmMin ? 100 : 200 - Math.round(((p.value - wpmMin) / (wpmMax - wpmMin)) * (hGT - 20) ) - 10;
    return {x, y, value: p.value, label: p.label};
  });
  pts.forEach((pt, idx) => {
    pathD += (idx === 0) ? `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}` : ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
  });

  // SVG elements for points with titles
  const circles = pts.map((pt, idx) => {
    const title = `${Math.round(pts[idx].value)} WPM on ${points[idx]?.label ?? ''}`;
    return h('circle', { cx: pt.x, cy: pt.y, r: 3, 'aria-label': `WPM ${Math.round(pts[idx].value)}` }, h('title', null, title));
  });

  // Optional quieter comprehension series (ADR-25 trends): 0-100% scaled to chart height.
  let compPath = null;
  if (showComp) {
    let d = '';
    pts.forEach((pt, idx) => {
      const c = points[idx]?.comp;
      const y = typeof c === 'number' ? 200 - Math.round((Math.min(100, Math.max(0, c)) / 100) * (hGT - 20)) - 10 : null;
      if (y !== null) d += (d === '' ? `M ${pt.x.toFixed(2)} ${y.toFixed(2)}` : ` L ${pt.x.toFixed(2)} ${y.toFixed(2)}`);
    });
    if (d !== '') compPath = h('path', { class: 'viz-line-comp', d, fill: 'none', 'stroke-width': '1.5' });
  }

  const svg = h('svg', {
    class: 'viz-chart',
    role: 'img',
    width: '100%',
    height: '200',
    viewBox: `0 0 ${w} 200`,
    'aria-label': showComp ? 'WPM and comprehension over sessions' : 'WPM over sessions'
  },
    h('path', { class: 'viz-line', d: pathD, fill: 'none', 'stroke-width': '2' }),
    ...(compPath ? [compPath] : []),
    ...circles
  );

  if (!showComp) return svg;
  // Two-series: the wrapper carries the accessible name; the inner svg stays silent.
  svg.removeAttribute('role');
  svg.removeAttribute('aria-label');
  const legend = h('p', { class: 'viz-legend' }, 'Solid: WPM · Faint: comprehension');
  return h('div', { class: 'viz-wrap', role: 'img', 'aria-label': 'WPM and comprehension over sessions' }, svg, legend);
}

export function bestPodium(sessions) {
  const eligible = (Array.isArray(sessions) ? sessions : [])
    .filter(s => typeof s.wpm === 'number' && typeof s.comprehensionPct === 'number' && s.comprehensionPct >= 60);
  eligible.sort((a, b) => {
    // higher wpm first; tie-breaker by earliest endedAt
    if (b.wpm !== a.wpm) return b.wpm - a.wpm;
    const ta = new Date(a.endedAt).getTime();
    const tb = new Date(b.endedAt).getTime();
    return ta - tb;
  });
  const top3 = eligible.slice(0, 3);

  const slots = [0, 1, 2].map(i => {
    if (top3[i]) {
      const s = top3[i];
      const el = h('div', { class: 'podium-slot' },
        h('span', { class: 'lap' }, `Lap ${i + 1}`),
        h('span', { class: 'value' }, `WPM ${s.wpm}`),
        h('span', { class: 'date' }, `${new Date(s.endedAt).toLocaleDateString()}`)
      );
      return el;
    }
    return h('div', { class: 'podium-slot placeholder' }, 'No lap yet');
  });

  return h('div', { class: 'podium', 'aria-label': 'Top podium' }, ...slots);
}

export function recordsList(records) {  // Accepts personalRecords() output: [{ id, label, unit, value, ... }].
  const byId = new Map((Array.isArray(records) ? records : []).map((r) => [r && r.id, r]));
  const items = RECORD_IDS.map((id) => {
    const rec = byId.get(id);
    const text = (!rec || rec.value === undefined || rec.value === null) ? '—' : `${rec.value}${rec.unit ? ` ${rec.unit}` : ''}`;
    return h('div', { class: 'record-item', 'data-id': id },
      h('span', { class: 'record-label' }, rec ? rec.label : id),
      h('span', { class: 'record-value' }, ` ${text}`)
    );
  });
  return h('div', { class: 'records', 'aria-label': 'Personal records' }, ...items);
}

export default { wpmChart, bestPodium, recordsList, wordsBars };

// 30-day words activity bars (ADR-25 trends): deterministic, local days, text labels.
export function wordsBars(sessions, { days = 30, today } = {}) {
  const count = (s) => Number(s.words ?? s.wordCount ?? NaN);
  const list = (Array.isArray(sessions) ? sessions : []).filter((s) => s && Number.isFinite(count(s)));
  if (list.length === 0) {
    return h('div', { class: 'viz-empty', 'aria-live': 'polite' }, 'No words logged yet');
  }
  const now = today ?? Date.now();
  const perDay = new Map();
  for (const s of list) {
    const key = dayKey(s.endedAt ?? s.startedAt ?? now);
    perDay.set(key, (perDay.get(key) ?? 0) + count(s));
  }
  const max = Math.max(1, ...perDay.values());
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const words = perDay.get(key) ?? 0;
    const height = Math.max(2, Math.round((words / max) * 48));
    cells.push(h('span', {
      class: 'words-bar' + (words > 0 ? ' words-bar-some' : ''),
      role: 'img',
      'aria-label': `${key}: ${words} words`,
      title: `${key}: ${words} words`,
      style: `height:${height}px`,
    }, ''));
  }
  return h('div', { class: 'words-bars', role: 'img', 'aria-label': `Words per day, last ${days} days` }, ...cells);
}
