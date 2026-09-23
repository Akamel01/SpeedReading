# M-RB3 review — `styles/tokens.css` + `index.html` link order + `app.css` `:root` removal

**Verdict: CHANGES_REQUIRED**
Date: 2026-09-23 · Reviewer: autoforge-reviewer (read-only) · Budget: one browser session, ports 8142/9372

Core split is correct and machine-verified. One blocker: the split **dropped a pre-existing custom property** (`--focus-color`), killing the `:focus-visible` outline — a real a11y regression that contradicts the execution report's claim of preserving pre-existing vars.

## Evidence (real outputs)

### 1. Token split — PASS
`styles/tokens.css:1-18` contains exactly the frozen `:root` block from `.scratch/speedreading-redesign/design/tokens.md:6-23` — all 16 declarations match verbatim (colors `--folio/--iron/--marker/--pencil/--rule/--oxblood`, 3 font stacks, `--font-scale:1`, `--text-align:center`, `--ease-calm`, 4 durations).

```
$ grep -n "^ *--" styles/app.css
(no output) grep_exit=1
```
Zero custom-property definitions left in `app.css`. `var(--x)` usages remain (3):
```
11:  text-align: var(--text-align);
15:  #app, #view-player { font-size: calc(16px * var(--font-scale)); }
19:  outline: 2px solid var(--focus-color);
```
```
$ grep -rn ":root" styles/ index.html | grep -v tokens.css
grep_exit=1   (acceptance "grep :root outside tokens.css exits nonzero" → met)
```
`git diff styles/app.css` shows the only change is the 5-line `:root` block replaced by a 1-line comment (`styles/app.css:2`).

### 2. Link order + serving — PASS
```
index.html:7:  <link rel="stylesheet" href="./styles/tokens.css" />
index.html:8:  <link rel="stylesheet" href="./styles/app.css" />

$ python3 -m http.server 8142 --bind 127.0.0.1
/ -> 200 · /styles/tokens.css -> 200 · /styles/app.css -> 200
```

### 3. Headless Chromium (real CDP session, `chrome-headless-shell` 151.0.7922.34, port 9372)
Loaded `http://127.0.0.1:8142/`, `Runtime.enable` + `Log.enable`, real computed styles:

```
bodyColor        : "rgb(17, 17, 17)"            ← #111, NOT rgb(26,24,21)
sheets           : tokens.css, app.css (in that order)
tokensLoaded     : ":root { --folio: #F6F4EC; --iron: #1A1815; ... --dur-status: 150ms; }"  (live, parsed)
--font-scale     : "1"   → #app font-size "16px";  forced --font-scale:2 → #app font-size "32px"  (token is live)
body text-align  : "center"                     (var(--text-align) resolves via tokens.css)
--iron resolves  : "#1A1815"
consoleMsgs      : []      exceptions: []
```

## Findings

1. **BLOCKER — `--focus-color` deleted, focus ring gone (a11y regression).** `git diff styles/app.css` removed `--focus-color: #5b9bd5;`; it was **not** added to `tokens.css` (repo-wide grep: referenced only at `app.css:19`, defined nowhere). Measured in Chromium after focusing a button: `outlineColor/Style/Width = "rgb(0, 0, 0) / none / 3px"` and `getPropertyValue('--focus-color')` → `""`. Invalid-at-computed-value-time collapses `outline` to its initial value (`style:none`), so no focus indicator renders (pre-change it was `2px solid #5b9bd5`). This is a WCAG 2.4.7 regression and falsifies `.autoforge/execution/M-RB3.md:3` ("incl. pre-existing vars"). **Fix (one line):** add `--focus-color: #5b9bd5;` to `styles/tokens.css` `:root` (preferred — keeps app.css property-free) or restore it in `app.css`.
2. **Check-3 body-color assertion fails against current files, but is out of M-RB3's contract.** Measured `rgb(17,17,17)` because `styles/app.css:10` still sets `color: #111` (untouched by this diff); M-RB3's acceptance is explicitly "zero visual change", so setting `var(--iron)` here would have been the violation. `--iron` is defined but used nowhere yet — needs an owner in a restyle ticket (RS1–RS6) or the check spec is wrong. Not counted against M-RB3.
3. PASS — tokens.css ↔ frozen `design/tokens.md` match is exact; no `:root`/new custom props outside tokens.css.
4. PASS — link order correct (tokens before app); all three URLs HTTP 200.
5. PASS — `--font-scale` is genuinely live from tokens.css (16px → 32px when overridden), zero console errors/exceptions on load. Minor: `styles/app.css` was modified although plan.md:127 lists `touches: [styles/tokens.css, index.html]` — the removal is required by the objective, so only a bookkeeping nit.

## Required change
Restore `--focus-color` (finding 1). Everything else can ship as-is; re-review only needs the one-line fix plus a focus-ring re-measure.
