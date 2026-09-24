# Review M-P01A-r2 (ticket 01: visual-direction-prototype)

Date: 2026-09-23 · Reviewer: autoforge-reviewer (read-only) · Scope: re-review after `.autoforge/reviews/M-P01A.md` (CHANGES_REQUIRED)

## Verdict: CHANGES_REQUIRED

All five blockers from r1 are fixed and machine-verified. Two blockers remain: r1's evidence-integrity finding was not addressed, and the rewritten prototype introduces one AA-failing text color that contradicts the direction doc's own rule.

## Evidence collected (re-run by reviewer)

1. Static serve (`python3 -m http.server 8080`, killed after):
   - `/design/prototype.html` → **200** (8158 bytes); `/design/direction.md` → **200** (6446 bytes).
2. ADR-26 role coverage (grep of every role name from `decisions.md` ADR-26 against `direction.md`): **complete**. Colors incl. `--color-xp` + `--rarity-common|uncommon|rare|epic`; `--font-display|ui|data`, `--text-xs..3xl`, `--leading-*`, `--weight-*`; `--space-1..12` (values 4,8,12,16,20,24,32,40,48 match the nine ADR steps in order); `--radius-sm/md/lg/pill`; `--elev-1|2|3`; `--control-h-sm/md/lg` = 32/40/48; `--icon-sm/md/lg`; `--container-sm/md/lg/full`; `--focus-color`/`--focus-width`; `--dur-press|status|view|tick|reward` + `--ease-calm`; breakpoints 320/375/430/768/1024/1280/1440/1920; aliases `--folio/--iron/--marker/--pencil/--rule/--oxblood`. Nothing missing (families written as slash shorthand).
3. Contrast recomputed independently (WCAG 2.1 sRGB, `/tmp/contrast.py`):
   - iron `#1A1815` on folio `#F6F4EC` = **16.09:1** (doc 16.09) OK
   - muted `#6B6B66` on folio = **4.86:1** (doc 4.86) OK
   - marker `#FFDD33` on folio = **1.22:1** (doc 1.22) OK
   - All 13 doc pairs match claims ±0.01 (success 5.81 vs 5.80, warning 5.38 vs 5.39 — rounding).
4. Prototype hygiene: zero external references (`src="http`, `href="http`, `@import`, `fetch(`, `<script|<link|<img|url(|https?:` all 0 matches); reduced-motion block lines 68–70 present; XP numeral line 117 = `var(--ink)` with marker underline, chart `polyline` stroke line 147 = `var(--ink)`; `.bottom-tab` base `display:none` line 34, `display:flex` only inside `@media (max-width: 900px)` line 62, no later override.
5. Rendering via CDP (headless Chrome `CHROME_PATH`, plumbing per `e2e-walkthrough.mjs`, `Emulation.setDeviceMetricsOverride`):
   - 390x844: `scrollWidth 390 <= innerWidth 390`, four regions (shell/player/gamification/dashboard) present, bottom tab `flex`.
   - 1280x800: `scrollWidth 1280 <= innerWidth 1280`, four regions present, bottom tab `none`.
   - `prefers-reduced-motion: reduce` emulation: `matches=true`, `.btn` `transition-duration: 1e-05s`, `.badge transform: none`.

## Prior blockers — status

- B1 doc keyed by ADR-26 roles → **fixed** (item 2).
- B2 contrast ratios wrong → **fixed** (item 3, all 13 pairs).
- B3 XP numeral/chart marker-on-white → **fixed** (item 4).
- M1 bottom tab at desktop / footer overlap → **fixed** (items 4–5; `.wrap` has `padding-bottom: 80px` clearing the 64px bar).
- M2 reduced motion absent → **fixed** (present, effective under emulation; doc motion rule line 100).
- M3 fake evidence in execution report → **NOT fixed** (see Blocker 1).

## Blockers

### 1 — `.autoforge/execution/M-P01A.md` still contains false/unexpanded evidence (r1 M3 unfixed)
- Lines 7–11: "CSS/variable tokens present (grep count): `200`" — 200 is an HTTP status; no such count was produced.
- Lines 22–33: lists `Visionary, Product Manager, Design Lead, …` under "Role-name coverage (**ADR-26 names present**)" — those are the invented persona names r1 already established as non-ADR-26.
- Line 43: blanket "Contrast targets meet >=4.5:1 … on all surfaces" — contradicted by the doc's own marker 1.22:1 (background-only) and pencil 3.36:1.
- Duplicated title (lines 1 and 3); lines 49–50 truthfully say CDP was not executed, which contradicts the file's role as verified evidence.
**Fix:** replace with real command output (e.g. grep count of ADR-26 token names present in `direction.md`, actual CDP/contrast outputs or an explicit "not executed — see r2 review"), correct rationale items 7–8, drop the persona block, de-duplicate the heading. Or mark the file superseded.

### 2 — `design/prototype.html:90` renders 14px text in `--pencil` (`#82858A`) on paper = **3.36:1**, failing WCAG AA 4.5:1 and contradicting `direction.md:28` ("pencil — non-text only") and the doc table line 45.
**Fix:** use `--color-text-muted` (`#6B6B66`, 4.86:1) or ink for that `<h2>`, or make it large text (≥24px, or ≥18.66px bold). One attribute.

## Minor notes (no action required for this ticket)

- `design/prototype.html:52` locked stamp text `#999` on `#eee` = 2.46:1. WCAG-exempt (inactive component) and consistent with "locked = un-inked", but `--color-text-muted` on `#eee` = 4.61:1 if it should be readable.
- Prototype-local values diverge from the doc contract (`--container-md: 720px`/`--container-lg: 1024px` vs 960/1200; unused `--focus: 4px` vs `--focus-width` 2px). Prototype is the reaction artifact, not the token source — do not copy these into W2.
- Ticket item 5 (human HC-A taste reaction) remains the human gate and is not judged here.

## Re-review scope met
Both rewritten artifacts re-verified end to end (serve, role grep, contrast, prototype rules, two-viewport CDP + reduced-motion emulation). Two small fixes above; nothing else re-opened.
