export function dayKey(ts) {
  if (typeof ts !== 'number' || !isFinite(ts)) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toDateFromKey(key) {
  if (typeof key !== 'string') return null;
  const parts = key.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if ([y, m, d].some(n => Number.isNaN(n))) return null;
  return new Date(y, m - 1, d);
}

function dayKeyFromDate(date) {
  if (!(date instanceof Date)) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dayMap(sessions) {
  const byKey = new Map();
  if (!Array.isArray(sessions)) return new Map();
  for (const s of sessions) {
    const t = s?.startedAt;
    if (typeof t !== 'number' || !isFinite(t)) continue;
    const key = dayKey(t);
    if (!key) continue;
    const curr = byKey.get(key) ?? { count: 0, words: 0 };
    const w = typeof s?.wordCount === 'number' && isFinite(s.wordCount) ? s.wordCount
      : typeof s?.words === 'number' && isFinite(s.words) ? s.words : 0;
    curr.count += 1;
    curr.words += w;
    byKey.set(key, curr);
  }
  const sortedEntries = Array.from(byKey.entries()).sort((a, b) => {
    const da = toDateFromKey(a[0]);
    const db = toDateFromKey(b[0]);
    if (!da || !db) return 0;
    return da - db;
  });
  return new Map(sortedEntries);
}

export function streakStats(dayMapObj, todayKey) {
  const keys = dayMapObj ? Array.from(dayMapObj.keys()) : [];
  if (keys.length === 0) return { current: 0, longest: 0, lastDay: null, activeToday: false };

  const sortedKeys = keys.slice().sort((a, b) => {
    const da = toDateFromKey(a);
    const db = toDateFromKey(b);
    if (!da || !db) return 0;
    return da - db;
  });

  const lastDayKey = sortedKeys[sortedKeys.length - 1];
  // helper: derive yesterday key from a given todayKey using local dates
  const yesterdayKeyFromToday = (tk) => {
    if (typeof tk !== 'string') return null;
    const tDate = toDateFromKey(tk);
    if (!tDate) return null;
    const yDate = new Date(tDate);
    yDate.setDate(tDate.getDate() - 1);
    return dayKeyFromDate(yDate);
  };

  const activeToday = typeof todayKey === 'string' && dayMapObj.has(todayKey);
  // base day is today when present, otherwise the most recent day with activity
  let baseDayKey = null;
  if (activeToday && dayMapObj.has(todayKey)) {
    baseDayKey = todayKey;
  } else if (lastDayKey && dayMapObj.has(lastDayKey)) {
    baseDayKey = lastDayKey;
  }
  // Grace: only consider the base day if it is today or yesterday; otherwise current = 0
  if (baseDayKey && typeof todayKey === 'string') {
    const yesterdayKey = yesterdayKeyFromToday(todayKey);
    if (baseDayKey !== todayKey && baseDayKey !== yesterdayKey) {
      baseDayKey = null;
    }
  }

  // compute current streak ending at baseDayKey (0 if none)
  let current = 0;
  if (baseDayKey && dayMapObj.has(baseDayKey)) {
    let cur = baseDayKey;
    while (dayMapObj.has(cur)) {
      current += 1;
      const d = toDateFromKey(cur);
      if (!d) break;
      d.setDate(d.getDate() - 1);
      const prev = dayKeyFromDate(d);
      if (dayMapObj.has(prev)) cur = prev;
      else break;
    }
  }

  // compute longest streak anywhere
  let longest = 0;
  let run = 0;
  let prevDateNoon = null;
  for (const k of sortedKeys) {
    const date = toDateFromKey(k);
    if (!date) continue;
    const curNoon = new Date(date);
    curNoon.setHours(12, 0, 0, 0);
    if (prevDateNoon == null) {
      run = 1;
    } else {
      const diffDays = Math.round((curNoon - prevDateNoon) / 86400000);
      if (diffDays === 1) run += 1;
      else run = 1;
    }
    if (run > longest) longest = run;
    prevDateNoon = curNoon;
  }

  return { current, longest, lastDay: lastDayKey, activeToday };
}
