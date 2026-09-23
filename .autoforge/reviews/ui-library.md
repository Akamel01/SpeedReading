# Review — module `ui-library`

Reviewer: autoforge-reviewer (read-only, independent)
Date: 2026-09-22
Artifacts reviewed: `src/ui/library.js` (136 lines), `test/harness/library.html` (36 lines), `index.html` (#view-library), `styles/` ownership, `src/ui/a11y.js`, plan.md §1a/§1b + M11
Worker evidence: `.autoforge/execution/ui-library.md`

## Verdict: APPROVED_WITH_NOTES

Contract met on all required axes: exact callback names, subtree-only DOM, no ids invented, no network/timers/store, input reset both paths, rights/DRM notice, list rows, empty state, keyboard-operable controls, and injection-safe rendering. Two low-severity notes (focus edge case, HTML validity of empty state) do not block.

## Checks run (real outputs)

1. Static syntax + serving
   - `node --check src/ui/library.js` → exit `0` (no output).
   - `python3 -m http.server 8095` (background) then
     `curl -s -o /dev/null -w '%{http_code}' http://localhost:8095/test/harness/library.html` → `200`
   - `curl ... http://localhost:8095/index.html` → `200`
   - server killed after use.

2. Static audit (greps over `src/ui/library.js`)
   - No `id=` anywhere (grep empty). Only `className` / `dataset` / `setAttribute` used → no new ids, classes-only as required.
   - No `fetch(`, `setTimeout`, `setInterval` (grep empty). No `import`/`require` statements at all → no store access, no network, no timers.
   - Callback names exact: `onImportFile` (line 15), `onOpenText` (111), `onDeleteText` (119), `onExport` (30), `onImportJson` (48) — all optional-chained (`?.`) so missing handlers cannot throw.
   - File-input reset present both paths: `importInput.value = ''` at line 17; `jsonInput.value = ''` at line 54.
   - DOM writes under the provided `root` only (`root.appendChild(container)`, line 77). No `document.getElementById`.

3. Harness (`test/harness/library.html`)
   - Imports the real module: `import { createLibraryView } from '../../src/ui/library.js';` (line 13) — not a copy.
   - Wires stub handlers for all 5 callbacks: `onImportFile, onOpenText, onDeleteText, onExport, onImportJson` (lines 17–23).
   - Renders 2 sample texts including one epub: `{ id: 't2', title: 'Book Epibook', source: 'epub', wordCount: 2400 }` (line 29).
   - Harness page provides its own `#view-library` section matching §1b (line 9) — acceptable, harness is an M11-owned output.

4. Adversarial probes (static)
   - Empty/absent file on `change`: guarded `const f = importInput.files ? importInput.files[0] : null; if (f) {...}` (lines 13–18) — no crash, callback not invoked. Same guard for JSON input (lines 42–55).
   - `render([])` / `render(null)`: `texts = newTexts || []` then `if (!texts.length)` renders visible "Library is empty." in an `aria-label`ed node (lines 84–92). Works.
   - Entry missing `wordCount`: `` ` (${t.source}, ${t.wordCount ?? 0} words)` `` (line 103) → `0`, no `undefined` leakage. Missing `source` would render literal `undefined` (not in contract, noted only).
   - XSS probe: title `<img onerror=...>` — inserted via `title.textContent = t.title;` (line 99); metadata via `meta.textContent` (line 103). Only `innerHTML` use is `list.innerHTML = ''` (line 86), a clear with no interpolated data. **Injection-safe: textContent, not HTML.**

## Findings

1. **Focus lost when deleting the last remaining item** (low). Delete handler (lines 118–125) re-renders then focuses `list.querySelector('button[data-action="open"]')`; when the list is empty no such button exists and focus falls to `<body>`. The contract line "focus returns to list after delete" holds for non-empty lists only; the empty-state node and `ul` carry no `tabindex="-1"`. Fix if desired: give `list` (or the empty-state node) `tabindex="-1"` and focus it as the fallback.
2. **Empty-state `<div>` is an invalid child of `<ul>`** (low). Line 88 appends a `div` into the `ul` (only `li`/script/template are valid children). Render it as `<li>` or move it outside the list. Harmless in practice; relevant to the accessibility review gate.
3. **Optimistic local deletion duplicates store ownership** (info). After `onDeleteText?.(t.id)` the view locally filters and re-renders (lines 120–121) while §1a assigns the store to `app`. If the app rejects/cancels the delete, the row is still gone until the next `render`. Acceptable for this milestone; revisit if delete gains confirmation.
4. **Harness coverage is shallow** (info). No interaction script; delete-focus, empty state, and file-change paths are not exercised in the page. Contract for M11 only requires a stub-wired harness, so this is noted, not required.
5. **JSON parse failure is silent to the user** (info). `catch { console.error('Invalid JSON', err) }` (lines 49–51). No user-facing message; not in contract, cheap follow-up via `a11y.announce` if desired.

No regressions observed: module touches nothing outside its declared files, creates no ids, and does not violate §1c invariants (no timers/fetch/store/document-at-import).

## Evidence paths
- `src/ui/library.js:12-19,30,48,54,86,99-103,111,118-125`
- `test/harness/library.html:13,17-23,29`
- `.autoforge/plans/plan.md:65-95,199-205`
- `.autoforge/execution/ui-library.md`
