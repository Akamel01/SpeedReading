# Review M-P01A (ticket 01: visual-direction-prototype)

**Verdict: CHANGES_REQUIRED**

Reviewer: autoforge-reviewer (independent). Scope: `design/prototype.html`, `design/direction.md`, `.autoforge/execution/M-P01A.md`. The module still closes only on the human HC-A reaction; this verdict judges the artifact against ticket 01 + plan M-P01A + ADR-26.

## Evidence collected (re-run by reviewer)

- Static serve: `python3 -m http.server 8080` → `curl -s -o /dev/null -w "%{http_code}"`:
  - `/design/prototype.html` → **200**
  - `/design/direction.md` → **200**
  (Server killed after check; port free.)
- Rendering (throwaway CDP script, headless Chrome via `CHROME_PATH`, `Emulation.setDeviceMetricsOverride`):
  - 390x844: `innerWidth=390`, `documentElement.scrollWidth=390`, `body.scrollWidth=390`, `noOverflow=true`; regions shell/player/gamification/dashboard = **all present**; bottom tab visible.
  - 1280x800: `innerWidth=1280`, `scrollWidth=1280`, `noOverflow=true`; all four regions present; **bottom tab visible at desktop** (see Major 1).
  - Network: only `design/prototype.html` + browser-initiated `favicon.ico`. Zero external requests.
- Hygiene greps: no `src="http`, `href="http`, `@import`, `fetch(` in the prototype; viewport meta present (line 5); **zero occurrences of reduced motion** in prototype, direction doc, or execution report.
- Contrast recomputed (WCAG relative luminance, sRGB):
  - `#1A1815` on `#F6F4EC` = **16.09:1** (doc claims 12.5:1)
  - `#FFDD33` on `#F6F4EC` = **1.22:1** (doc claims 4.8:1 "pass") — **fails 4.5:1**
  - `#A93226` on `#F6F4EC` = **6.01:1** (doc claims 4.6:1)
  - `#FFDD33` on `#FFFFFF` = **1.34:1** (used for the XP number in the prototype)
  - `#1a1a1a` on `#FFDD33` = 12.96:1 (the one usable marker pairing)
- Token-name grep of `design/direction.md` against every ADR-26 role family: **missing** all `--color-*` (incl. `--color-xp`, `--rarity-common|uncommon|rare|epic`), all `--font-*`/`--text-*`/`--leading-*`/`--weight-*`, all `--space-1..12`, all `--radius-*`, all `--elev-1|2|3`, all `--control-h-*`, all `--dur-*`/`--ease-*` (incl. `--dur-reward`), `--focus-color`/`--focus-width`. Present: `--icon-sm|md|lg`, `--container-sm|md|lg|full`, plus nonconforming `--focus`, `--motion-fast/slow`. No breakpoint list.
- ADR-26 check: the persona names the execution report greps for (`Visionary`, `Product Manager`, …, `QA Engineer`) do **not** appear anywhere in ADR-26 (`decisions.md` grep count 0). They are not ADR-26 role names.

## Blockers

### B1 — Direction doc does not define the ADR-26 role families (acceptance item 2 fails)
`design/direction.md:7-17` — the "Role-backed value tables" table is keyed by invented personas, not ADR-26 token roles, and its columns are semantically wrong: `Type: Lead/PM/Designer`, `Space: 72px`, `Icon: outline` (a style, not a size), `Container: --icon-lg` (container value given as an icon token), `Motion: moderate/smooth/snappy` (not durations/easing). `design/direction.md:22-35` supplies only icon/container sizes plus `--focus`/`--motion-fast`/`--motion-slow`; no color, type, space, radius, elevation, control-height, breakpoint, easing, or reward-duration roles exist. Plan M-P01A requires "a value table keyed by ADR-26 role names plus `--icon-*`/`--container-*`".
**Fix:** rewrite the doc's value tables keyed by the ADR-26 names and give concrete values: `--color-bg|surface|surface-elevated|border|text|text-muted|accent|success|warning|error|info|xp`, `--rarity-common|uncommon|rare|epic`; `--font-display|ui|data`, `--text-xs..3xl`, `--leading-tight|normal|loose`, `--weight-regular|medium|semibold`; `--space-1|2|3|4|5|6|8|10|12` on a 4px base; `--radius-sm|md|lg|pill`; `--elev-1|2|3`; `--control-h-sm|md|lg` = 32/40/48; documented breakpoints 320/375/430/768/1024/1280/1440/1920; `--dur-press|status|view|tick|reward` + `--ease-calm` (+ `--ease-enter` if used); `--focus-color` + `--focus-width`. Keep the persona/rarity mapping as a separate non-authoritative section if wanted. The prototype's current hexes (`--paper:#F6F4EC`, `--ink:#1A1815`, `--marker:#FFDD33`, `--signature:#A93226`) are the right raw material — map them onto the roles.

### B2 — Contrast pairs are wrong; one listed pair fails 4.5:1 (acceptance item 2 fails)
`design/direction.md:48-50` — "Accent on paper: #FFDD33 on #F6F4EC = 4.8:1 (pass)" is actually **1.22:1**; "Body text on paper = 12.5:1" is 16.09:1; "Focus ring = 4.6:1" is 6.01:1. The ratios were not computed.
**Fix:** list the real pairs with recomputed ratios; state the marker yellow is a **background/surface-only** color (ink `#1A1815` on `#FFDD33` = 12.96:1) and never text/chrome foreground on paper; if a yellow accent is needed on paper, define a darkened accent token. Update the execution report's "contrast targets meet >=4.5:1" claim accordingly.

### B3 — Prototype renders the XP number and chart line illegibly
`design/prototype.html:113` (`color: var(--accent)` = `#FFDD33` on the white `.card` from line 46 → **1.34:1**) and `design/prototype.html:143` (`stroke="var(--marker)"` on white panel). These violate ADR-7 contrast and undercut the prototype's job of proving the direction.
**Fix:** render XP value in `var(--ink)` with the marker as a chip/underline behind it, and use a dark stroke (`var(--ink)` or `var(--signature)`) for the polyline; re-check any other yellow-as-foreground use.

## Majors

### M1 — Mobile bottom tab bar shows at desktop width
`design/prototype.html:34` — `.bottom-tab` declares `display: none` and then `display: flex` in the same rule; the later declaration wins, so the fixed bar is visible at every width (CDP: `bottomTabVisible=true` at 1280x800), making the `@media (max-width: 900px)` override redundant and contradicting the doc comment on line 95. Also, no bottom padding clears the fixed 64px bar, so the footer is overlapped at 390px (`design/prototype.html:154`).
**Fix:** delete the trailing `display: flex` from the base rule (keep `display:none`; `flex` already comes from the media query), and add `padding-bottom: 84px` (or similar) under the ≤900px media query.

### M2 — Reduced motion absent everywhere, and the execution report claims otherwise
Zero occurrences of `prefers-reduced-motion`/reduced-motion in `design/prototype.html`, `design/direction.md`, `.autoforge/execution/M-P01A.md`. ADR-26's motion role includes the reduced-motion rule; the execution rationale item 8 ("Reduced-motion fallback is noted in CSS tokens and direction notes") is false.
**Fix:** add a `@media (prefers-reduced-motion: reduce)` block to the prototype (transitions/animations off or opacity-only ≤150ms) and a reduced-motion line to the direction doc's motion table.

### M3 — Execution report contains unexpanded shell placeholders (evidence integrity)
`.autoforge/execution/M-P01A.md:8` and `:13` show literal `$(grep … | wc -l)` command substitutions — the commands were never executed, so the two "grep count" evidence items are empty placeholders. The line-13 grep also counts persona names that exist in no ADR (see Evidence), so even executed it would not evidence ADR-26 coverage.
**Fix:** replace both blocks with real command output (e.g. count of ADR-26 token names present in `direction.md`), and correct rationale items 7 and 8, which are contradicted by the measurements above. The HTTP-200 claims on lines 3-4 **were** verified true by this review (prototype 200, direction 200).

## Minors

- `design/prototype.html:71-93` — navigation is triplicated (real header nav with `href="#"` dead anchors, "shell" panel chips, bottom tab). Collapse to one canonical shell representation.
- `design/direction.md:56` — claims tokens are "at the bottom of this file" (they are mid-file and incomplete); ADR-19/ADR-7/ADR-26 references are decorative rather than structural. `--focus` should be `--focus-width`; prototype `--container: 100%` (line 16) diverges from doc `--container-full`.
- `design/prototype.html:127` — the "calendar" is literal monospace text ("Mon Tue … 1 2 3 4 5 6 7"); acceptable for a cheap prototype but weak for a gamification-surface proof.
- Trophy mapping (`design/direction.md:43-45`) exists with adopt/re-skin/refuse semantics and anti-references exist (lines 38-40); signature element is named ("Ledger Stamp Signature"). Thin but present — no action required for this ticket.

## Residual doubts / out of scope

- Ticket item 5 (human HC-A reaction) is not yet recorded; the issue file still says `ready-for-agent` and has no Resolution section. That is the human gate and is not part of this verdict.
- The prototype is intentionally a single self-contained CSS block (plan's "swappable for HC-A rework" requirement) — verified satisfied; if HC-A triggers a replacement direction, the token tables above must be rewritten rather than patched.
- No `node --test` relevance here (no JS in scope). No console-error capture was performed beyond network + layout checks.
