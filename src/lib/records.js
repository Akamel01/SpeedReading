// src/lib/records.js — personal records + strict improvement events (ADR-24).
// Pure; no clock. Ties resolve to the earliest event. Drill exclusions per ADR-24.

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function scoredEligible(s) {
  return Boolean(s) && s.drill !== 'span' && isNum(s.comprehensionPct) && s.comprehensionPct >= 60 && isNum(s.wpm);
}

const SESSION_RECORDS = [
  { id: 'fastest-wpm', label: 'Fastest lap', unit: 'wpm', value: (s) => s.wpm, eligible: scoredEligible },
  { id: 'best-comprehension', label: 'Best comprehension', unit: '%', value: (s) => s.comprehensionPct, eligible: scoredEligible },
  { id: 'best-combined', label: 'Best combined', unit: 'score', value: (s) => s.wpm * (s.comprehensionPct / 100), eligible: scoredEligible },
  { id: 'longest-session', label: 'Longest session', unit: 'ms', value: (s) => s.elapsedMs, eligible: (s) => Boolean(s) && isNum(s.elapsedMs) },
  { id: 'fastest-wpm-chunk-1', label: 'Fastest one-word lap', unit: 'wpm', value: (s) => s.wpm, eligible: (s) => scoredEligible(s) && s.chunkSize === 1 },
  { id: 'fastest-wpm-chunk-2', label: 'Fastest two-word lap', unit: 'wpm', value: (s) => s.wpm, eligible: (s) => scoredEligible(s) && s.chunkSize === 2 },
  { id: 'fastest-wpm-chunk-3', label: 'Fastest three-word lap', unit: 'wpm', value: (s) => s.wpm, eligible: (s) => scoredEligible(s) && s.chunkSize === 3 },
];

const DAY_RECORDS = [
  { id: 'most-words-day', label: 'Most words in a day', unit: 'words', field: 'words' },
  { id: 'most-sessions-day', label: 'Most laps in a day', unit: 'sessions', field: 'count' },
];

const ALL_IDS = [...SESSION_RECORDS.map((r) => r.id), ...DAY_RECORDS.map((r) => r.id), 'longest-streak'];

function sortedSessions(sessions) {
  return (Array.isArray(sessions) ? sessions : [])
    .filter((s) => s && isNum(s.endedAt))
    .slice()
    .sort((a, b) => a.endedAt - b.endedAt);
}

function dayEntries(dayMap) {
  const entries = [];
  if (dayMap instanceof Map) {
    for (const [day, v] of dayMap.entries()) entries.push([day, v]);
  } else if (dayMap && typeof dayMap === 'object') {
    for (const day of Object.keys(dayMap)) entries.push([day, dayMap[day]]);
  }
  return entries
    .filter(([day, v]) => day && v && typeof v === 'object')
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

function dayTimestamp(day) {
  const parts = String(day).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
}

function longestStreak(dayMap) {
  const serials = dayEntries(dayMap)
    .map(([day]) => {
      const parts = day.split('-').map(Number);
      return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
    })
    .filter(isNum)
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = null;
  let bestEnd = null;
  for (const s of serials) {
    run = prev !== null && s === prev + 1 ? run + 1 : 1;
    if (run > best) {
      best = run;
      bestEnd = s;
    }
    prev = s;
  }
  return { value: best, endSerial: bestEnd };
}

function serialToDay(serial) {
  const d = new Date(serial * 86400000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

// All 10 records, always present. `at` is the earliest event holding the record value.
export function personalRecords(sessions, { dayMap } = {}) {
  const list = sortedSessions(sessions);
  const out = [];

  for (const def of SESSION_RECORDS) {
    let best = null;
    let at = null;
    let sessionId = null;
    let ties = 0;
    for (const s of list) {
      if (!def.eligible(s)) continue;
      const value = def.value(s);
      if (!isNum(value)) continue;
      if (best === null || value > best) {
        best = value;
        at = s.endedAt;
        sessionId = s.id ?? null;
        ties = 1;
      } else if (value === best) {
        ties += 1;
      }
    }
    out.push({ id: def.id, label: def.label, unit: def.unit, value: best ?? 0, at: best === null ? null : at, sessionId, ties });
  }

  for (const def of DAY_RECORDS) {
    let best = null;
    let at = null;
    let day = null;
    let ties = 0;
    for (const [key, v] of dayEntries(dayMap)) {
      const value = isNum(v[def.field]) ? v[def.field] : 0;
      if (best === null || value > best) {
        best = value;
        at = dayTimestamp(key);
        day = key;
        ties = 1;
      } else if (value === best) {
        ties += 1;
      }
    }
    out.push({ id: def.id, label: def.label, unit: def.unit, value: best ?? 0, at: best === null ? null : at, day, ties });
  }

  const streak = longestStreak(dayMap);
  out.push({
    id: 'longest-streak',
    label: 'Longest streak',
    unit: 'days',
    value: streak.value,
    at: streak.endSerial === null ? null : dayTimestamp(serialToDay(streak.endSerial)),
    day: streak.endSerial === null ? null : serialToDay(streak.endSerial),
    ties: streak.value > 0 ? 1 : 0,
  });

  return out;
}

// Strict improvements in chronological order: one event per record when the best is beaten.
export function recordImprovements(sessions, { dayMap } = {}) {
  const list = sortedSessions(sessions);
  const events = [];

  for (const def of SESSION_RECORDS) {
    let best = null;
    for (const s of list) {
      if (!def.eligible(s)) continue;
      const value = def.value(s);
      if (!isNum(value)) continue;
      if (best === null || value > best) {
        events.push({ id: def.id, at: s.endedAt, value, previous: best, sessionId: s.id ?? null });
        best = value;
      }
    }
  }

  for (const def of DAY_RECORDS) {
    let best = null;
    for (const [key, v] of dayEntries(dayMap)) {
      const value = isNum(v[def.field]) ? v[def.field] : 0;
      if (best === null || value > best) {
        events.push({ id: def.id, at: dayTimestamp(key), value, previous: best, day: key });
        best = value;
      }
    }
  }

  let bestStreak = 0;
  let run = 0;
  let prev = null;
  for (const [key] of dayEntries(dayMap)) {
    const parts = key.split('-').map(Number);
    const serial = Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
    if (!isNum(serial)) continue;
    run = prev !== null && serial === prev + 1 ? run + 1 : 1;
    if (run > bestStreak) {
      events.push({ id: 'longest-streak', at: dayTimestamp(key), value: run, previous: bestStreak === 0 ? null : bestStreak, day: key });
      bestStreak = run;
    }
    prev = serial;
  }

  return events.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
}

export const RECORD_IDS = ALL_IDS;
