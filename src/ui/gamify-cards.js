// src/ui/gamify-cards.js
// Lightweight, dependency-free renderers for gamification cards.
// Uses the existing h() helper to avoid any DOM access at import time.
// Exports:
//   xpCard(state)
//   streakCard(stats)
//   challengeCard(challenge, progress)
//   achievementGrid(catalog, unlockedIds)
//   unlockMoment(achievement)

import { h } from './h.js';
import { levelFor } from '../lib/xp.js';

// Simple XP card: shows current XP progress toward next level as a progressbar
export function xpCard(state) {
  const xp = typeof state?.xp === 'number' ? state.xp : 0;
  const lvl = levelFor(xp);
  const pct = Math.round((lvl.progress) * 100);
  const atMax = lvl.progress >= 1;
  const progressText = atMax ? `${pct}% — ${lvl.name} (highest honour)` : `${pct}% to next level`;
  const el = h('section', { class: 'gamify-card xp', 'aria-label': `XP ${xp} at level ${lvl.name}` },
    h('div', { class: 'xp-title' }, `XP: ${xp}`),
    h('div', {
      role: 'progressbar',
      'aria-valuenow': String(pct),
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-label': atMax ? `Level ${lvl.name}, highest honour` : `Progress to next level: ${lvl.nextThreshold}`
    },
      progressText
    )
  );
  return el;
}

// Streak card: 7-day calendar with text day labels; marks days if provided
export function streakCard(stats) {
  // Flexible input: optional stats.dayMap or stats.todayKey; render 7 days with labels
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = [0, 1, 2, 3, 4, 5, 6];
  // Optional readable indicator for activity; if dayMap is provided as a Map with day keys
  let activity = new Set();
  if (stats?.dayMap instanceof Map) {
    activity = new Set([...stats.dayMap.keys()]);
  }
  // Build 7-day window: today, yesterday, ..., 6 days back
  const container = h('section', { class: 'gamify-card streak', 'aria-label': 'Streak calendar' },
    h('div', { class: 'streak-title' }, 'Streak'),
    h('div', { class: 'streak-calendar', 'aria-label': '7-day streak calendar' },
      days.map((idx) => {
        // compute date label for this cell; anchor: today minus idx days
        const dte = new Date();
        dte.setDate(dte.getDate() - idx);
        const label = dayNames[dte.getDay()];
        const key = `${dte.getFullYear()}-${String(dte.getMonth() + 1).padStart(2, '0')}-${String(dte.getDate()).padStart(2, '0')}`;
        const active = activity.has(key);
        return h('span', { class: 'streak-cell' }, `${label}${active ? ' •' : ''}`);
      })
    )
  );
  return container;
}

// Challenge card: render derived progress with accessible progress indicator
export function challengeCard(challenge = {}, progress) {
  // Accept precomputed progress or derive from challenge.progress
  const p = progress ?? challenge.progress ?? { current: 0, target: 1, pct: 0 };
  const pct = Number.isFinite(p.pct) ? Math.min(100, Math.max(0, p.pct)) : 0;
  const el = h('section', { class: 'gamify-card challenge', 'aria-label': `Challenge: ${challenge.title ?? ''}` },
    h('div', { class: 'challenge-title' }, challenge.title ?? 'Challenge'),
    h('div', { role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': 'Challenge progress' },
      `${pct}%`
    )
  );
  return el;
}

// Achievement grid: renders each achievement glyph or lock state; hidden achievements skip rendering until unlocked
let __unlockTracker = new Set();
export function unlockMoment(achievement = {}) {
  const id = achievement?.id;
  if (!id) return null;
  if (__unlockTracker.has(id)) return null; // render only once per unlock
  __unlockTracker.add(id);
  const root = h('div', { class: 'gamify-unlock', 'aria-label': `Unlocked: ${achievement.title ?? achievement.id}` },
    `Unlocked: ${achievement?.title ?? achievement?.id}`,
    h('button', { class: 'dismiss', on: { click: () => { root.remove(); } } }, 'Dismiss')
  );
  // ensure no autofocus or focus stealing
  // fade-in not strictly required; keep simple for test harness
  return root;
}

export function achievementGrid(catalog = [], unlockedIds = []) {
  const unlocked = new Set(Array.isArray(unlockedIds) ? unlockedIds : []);
  const items = catalog
    .filter((def) => {
      // hide secret until unlocked
      if (def.hidden && !unlocked.has(def.id)) return false;
      return true;
    })
    .map((def) => {
      const isUnlocked = unlocked.has(def.id);
      const glyph = isUnlocked ? def.glyph ?? '' : '';
      return h('div', { class: `achievement ${isUnlocked ? 'unlocked' : 'locked'} rarity-${def.rarity ?? 'common'}`, 'aria-label': isUnlocked ? `${def.title} unlocked` : `${def.title} locked` },
        h('span', { class: 'glyph' }, glyph || ' '),
        h('span', { class: 'title' }, def.title),
      );
    });
  return h('div', { class: 'gamify-achievements', 'aria-label': 'Achievements grid' }, items);
}
