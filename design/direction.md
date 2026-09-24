# Visual direction (run 003, product/01)

Single visual authority for implementation modules. Values below are the contract; W2 fills them into `styles/tokens.css` and `styles/app.css` without structural edits (ADR-26).

Posture: preserve and expand the incumbent folio/ink/marker world — a reading ledger, not an arcade. Signature element: **the stamp** (achievements, streak days, and session completions are pressed marks in a ledger).

## Color roles

| Role | Value | Use |
|---|---|---|
| `--color-bg` | `#F6F4EC` | page paper |
| `--color-surface` | `#FFFFFF` | cards, sheets |
| `--color-surface-elevated` | `#FFFFFF` + `--elev-3` | dialogs, popovers |
| `--color-border` | `#E3DED2` | rules, dividers, card edges |
| `--color-text` | `#1A1815` | body and headings |
| `--color-text-muted` | `#6B6B66` | captions, meta (4.86:1 on paper) |
| `--color-accent` | `#FFDD33` | marker: highlights, stamp fills, backgrounds only |
| `--color-success` | `#2F6B3A` | success text/icons (5.80:1) |
| `--color-warning` | `#8A5A00` | warning text/icons (5.39:1) |
| `--color-error` | `#A93226` | errors, destructive (6.01:1) |
| `--color-info` | `#2A5A8A` | info text/icons (6.51:1) |
| `--color-xp` | `#A93226` on paper, `#FFDD33` on ink | XP counters |
| `--rarity-common` | `#82858A` | stamp border |
| `--rarity-uncommon` | `#2A5A8A` | stamp border |
| `--rarity-rare` | `#A93226` | stamp border |
| `--rarity-epic` | `#5B3A8A` | stamp border |

Aliases kept for existing code: `--folio: var(--color-bg)`, `--iron: var(--color-text)`, `--marker: var(--color-accent)`, `--pencil: #82858A` (non-text only), `--rule: var(--color-border)`, `--oxblood: var(--color-error)`.

**Marker rule:** `#FFDD33` is a background/highlight color. It is never used for text on light surfaces and never for chart strokes on paper. Text on marker is always ink (13.20:1).

## Computed contrast pairs (WCAG 2.1, sRGB)

| Pair | Ratio | Verdict |
|---|---|---|
| `#1A1815` on `#F6F4EC` (body on paper) | 16.09:1 | AAA |
| `#1A1815` on `#FFFFFF` (body on card) | 17.72:1 | AAA |
| `#1A1815` on `#FFDD33` (ink on marker) | 13.20:1 | AAA |
| `#6B6B66` on `#F6F4EC` (muted on paper) | 4.86:1 | AA |
| `#A93226` on `#F6F4EC` (error/xp on paper) | 6.01:1 | AA |
| `#2A5A8A` on `#F6F4EC` (info on paper) | 6.51:1 | AA |
| `#2F6B3A` on `#F6F4EC` (success on paper) | 5.80:1 | AA |
| `#8A5A00` on `#F6F4EC` (warning on paper) | 5.39:1 | AA |
| `#5B3A8A` on `#F6F4EC` (epic rarity text) | 7.89:1 | AAA |
| `#82858A` on `#F6F4EC` (pencil) | 3.36:1 | large text / non-text only |
| `#FFDD33` on `#F6F4EC` (marker on paper) | 1.22:1 | background only, never text |
| `#A93226` on `#1A1815` | 2.68:1 | never text on ink; use marker on ink |

## Type

| Role | Value |
|---|---|
| `--font-display` | `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif` |
| `--font-ui` | `system-ui, -apple-system, "Segoe UI", sans-serif` |
| `--font-data` | `ui-monospace, "SF Mono", Menlo, monospace` |
| `--text-xs` | `0.75rem` |
| `--text-sm` | `0.8125rem` |
| `--text-md` | `1rem` |
| `--text-lg` | `1.25rem` |
| `--text-xl` | `1.5rem` |
| `--text-2xl` | `2rem` |
| `--text-3xl` | `2.75rem` |
| `--leading-tight` | `1.15` |
| `--leading-normal` | `1.5` |
| `--leading-loose` | `1.7` |
| `--weight-regular` | `400` |
| `--weight-medium` | `500` |
| `--weight-semibold` | `600` |

Display faces carry headings, level names, and stamp numerals; data face (tabular-nums) carries WPM, XP, counts, and chart labels; UI face carries controls and body copy.

## Space, radius, elevation, controls

| Role | Value |
|---|---|
| `--space-1..12` | `4, 8, 12, 16, 20, 24, 32, 40, 48px` |
| `--radius-sm/md/lg/pill` | `4px, 8px, 14px, 999px` |
| `--elev-1` | `0 1px 2px rgba(26,24,21,0.06)` |
| `--elev-2` | `0 4px 12px rgba(26,24,21,0.08)` |
| `--elev-3` | `0 12px 32px rgba(26,24,21,0.10)` |
| `--control-h-sm/md/lg` | `32px, 40px, 48px` |
| `--icon-sm/md/lg` | `12px, 16px, 24px` |
| `--container-sm/md/lg/full` | `640px, 960px, 1200px, 100%` |
| `--focus-color` | `#A93226` |
| `--focus-width` | `2px` (plus 2px offset) |

Breakpoints (documented, used in media queries): 320, 375, 430, 768, 1024, 1280, 1440, 1920.

## Motion

| Role | Value |
|---|---|
| `--dur-press` | `100ms` |
| `--dur-status` | `150ms` |
| `--dur-view` | `180ms` |
| `--dur-tick` | `240ms` |
| `--dur-reward` | `320ms` (never blocks input) |
| `--ease-calm` | `cubic-bezier(0.2, 0, 0, 1)` |

Rules: no animation on RSVP chunks; card entrance ≤240ms; stamp-press is the only transform (scale 1.06 → 1.0 + opacity); `prefers-reduced-motion: reduce` → opacity-only ≤150ms, no transform, no count-up.

## Surfaces and texture

Cards sit on paper: white fill, `--color-border` hairline, `--elev-1` at rest, `--elev-2` on hover. Ledger areas (streak calendar, chart, stamp grids) are ruled with `--color-border` hairlines. Marker fills mark today, the current level segment, and the #1 podium slot. No gradients in chrome; no glassmorphism; header may keep the existing translucent blur.

## Trophy-to-product mapping

| Trophy | Decision |
|---|---|
| streak-badge | Re-skin as a ledger stamp chip: streak count in display numerals, ink on marker. |
| streak-calendar | Re-skin as a ruled ledger grid; day cells are text-labelled, today is a marker fill. |
| achievement-badge / achievement-grid | Re-skin as stamp plates: text glyph, rarity border color, locked = un-inked outline. |
| achievement-unlocked | Re-skin as the stamp-press moment: `role="status"`, dismissible, no focus steal, opacity-only under reduced motion. |
| points-badge | Re-skin as the XP stamp counter (data face, tabular numerals). |
| points-levels-list | Re-skin as the book-format ladder with progress bar (11 tiers). |
| points-chart | Re-skin as an ink polyline over ruled paper (hand-rolled SVG, no dependency). |
| leaderboard-podium | Adapt as a personal-best rosette podium (you vs. your past self). Social ranking refused. |
| leaderboard-rankings / leaderboard-card | Refuse: no social comparison (single user, mission §10). |
| points-boost | Refuse: no multiplier pressure or countdown urgency. |
| streak-card / achievement-card | Compose from our own cards; do not adopt Trophy layout. |

## Anti-references

- No dark SaaS dashboard look; no neon; no glassmorphism; no gradient chrome; no arcade/kawaii gamification; no giant empty areas; no badge art that reads as a mobile game. The world is paper, ink, and stamps.
