# Review — module `shell` (index.html, styles/app.css, src/ui/a11y.js, package.json)

- Reviewer: autoforge-reviewer (independent, read-only)
- Date: 2026-09-22 ~20:4x PDT
- Artifacts reviewed at (sha1, mtime):
  - `index.html` — `52a1790fae217219c93062d391cc67084d382b16`, 20:17:39
  - `styles/app.css` — `8689ded0a68940a8708321bab2f2666a87f29c4c`, 20:17:44
  - `src/ui/a11y.js` — `d66712c12456bff1fa3381014f736dbc7c90b2bf`, 20:17:52
  - `package.json` — `0a2227579902ccb1badcede472b041ff577268fb`, 20:17:54
- Contract source: `.autoforge/plans/plan.md` §1b (lines 82–95) + M1 acceptance (line 118)
- Shell files unchanged since 20:17; no writer activity on the `shell` touch set during review.

## Verdict: APPROVED_WITH_NOTES

All machine-checkable §1b items pass on the current tree. Two acceptance items are deferred, not passed: (a) M1's "no console errors" cannot hold yet because `./src/app.js` does not exist (G4 module not built — expected at this wave, not a shell defect); (b) contrast ≥4.5:1 is not machine-verifiable here. Both are recorded as deferred verification for the browser walkthrough (`verify-acceptance`).

## Findings

1. **PASS — DOM contract, verified against the served DOM (port 8099).** `python3 -m http.server 8099` + `curl -s http://localhost:8099/index.html`; per-id counts from the served bytes:
   ```
   app=1  view-library=1  view-player=1  view-quiz=1  view-dashboard=1  live-region=1
   ```
   Exactly one `<script>` tag: `<script type="module" src="./src/app.js">`. All four sections carry `hidden` (index.html:28-38). Controls are real buttons: `grep -c '<button type="button">' = 4` (index.html:15-18); `grep -n 'onclick|addEventListener|role="button"' index.html` → none. `#live-region` is single `aria-live="polite"` (index.html:23). Minor, non-blocking: live-region off-screen technique is declared twice (inline `left:-9999px` index.html:23 vs CSS `left:-10000px` styles/app.css:55) — harmless, two sources of truth.

2. **PASS — ORP anchor + settings vars + focus-visible.** `styles/app.css:40-42` `.rsvp-stage { display:grid; grid-template-columns: 1fr auto 1fr }`; `:47` `.rsvp-left { text-align: right; }`; `:48` `.rsvp-right { text-align: left; }`; `:3` `--font-scale: 1`; `:4` `--text-align: center`; `:22-25` `:focus-visible { outline: 2px solid var(--focus-color); outline-offset: 2px; }`. Matches §1b lines 90–93 verbatim in semantics.

3. **PASS — `src/ui/a11y.js`.** Exactly three exports, no more: `announce, focusMain, prefersReducedMotion` (grep `^export` → a11y.js:4,14,28). No import-time side effects: top-level lines are only comments + `export function` declarations; imported in bare Node with no DOM —
   ```
   exports: announce,focusMain,prefersReducedMotion
   prefersReducedMotion() -> false
   ```
   `announce` writes `document.getElementById('live-region').textContent` (a11y.js:16-19). `node --check` exit 0.

4. **PASS — `package.json` is exactly `{"type":"module"}`.** `od -c` shows `{ " t y p e " : " m o d u l e " } \n` (22 bytes); no `dependencies`, no `scripts`; no `package-lock.json` in repo. Matches M1 line 118 / plan §"cut" line 318.

5. **NOTE — `./src/app.js` is 404; M1's "no console errors" acceptance is unmet and untestable until G4.** Serve test: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8099/src/app.js` → `app.js HTTP 404` (`a11y.js HTTP 200`, `app.css HTTP 200`). `src/app.js` is owned by the later `app` module (plan §2 G4), so this is expected sequencing, not a shell regression — but a browser load WILL log a module-load error today. Deferred to `verify-acceptance`; do not mark M1's console-error clause green until `app.js` ships.

6. **DEFERRED — contrast ratio not machine-verifiable in this review.** §1b requires `styles/app.css` color/contrast tokens at ≥4.5:1 (plan.md:90); `--focus-color: #5b9bd5` and `color: #111` (styles/app.css:5,14) are plausible but unmeasured here. Route to the `verify-acceptance` browser walkthrough (computed-style contrast check), not counted as a pass.

## Scope note

Read-only review; no files modified outside this review artifact. Verification tied to the four sha1 hashes above — other repo modules were being written concurrently during review (e.g. `src/lib/*` mtimes 20:38–20:41), so re-hash before acting on any later revision.
