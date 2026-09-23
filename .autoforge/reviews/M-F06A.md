# Review — M-F06A (`scripts/a11y-checks.js`)

Reviewer: autoforge-reviewer (independent; orchestrator repair output). Date: 2026-09-23.
Artifact reviewed: `scripts/a11y-checks.js` (191 lines, read in full). Contract: `.autoforge/execution/M-F06A.md`.

## Verdict: CHANGES_REQUIRED

The harness is real (no mocks, real app, zero-dep) and passes on my machine — but its central
honesty claim is **factually false**, verified by two independent probes I ran against the exact
same binary. Two of eight checks rest on that false premise and under-cover where coverage was
possible. The claim IS the deliverable here (post-incident module), so this is not approvable as-is.

## My own run (reproduced)

```
$ node scripts/a11y-checks.js
PASS  keyboard: Space key map toggles playback (handler-level; OS-trusted pipeline uncovered headlessly — see header note)
PASS  keyboard: arrows/+/- handled, single view kept
PASS  announce: live region fires at sentence boundaries only — distinct announcements=2
PASS  focus: controls focusable in DOM order with visible outline + label — 12 stops checked
PASS  keyboard: Esc exits player to library
PASS  reduced-motion: manual sentence mode, no autoplay
PASS  contrast: body text >= 4.5:1 — ratio=18.88
PASS  page: zero uncaught page exceptions

8 passed, 0 failed
EXIT=0
```

Matches the worker's quoted output exactly. `.autoforge/validation/a11y-report.json` was rewritten
by my run (ranAt 2026-09-23T12:43:46Z) — live artifact, not stale. Hygiene: `pkill -f
chrome-headless-shell` run first; no leftovers before/after.

## Static checks (all pass)

- `grep -ni "mock|fallback" scripts/a11y-checks.js` → **zero hits** (exit 1). No fake DOM anywhere.
- `grep -n "playwright"` → only line 15: the *path string* to the Playwright-cached
  `chrome-headless-shell` binary. No `require("playwright")`, no dependency. 6 imports, all `node:`.
- Real file input (lines 94–98: `File`+`DataTransfer` into the actual `input[type=file]`, real
  `change` event); real player (`.player-btn-play`, `#view-player`); real live region
  (`#live-region`, matches `index.html:24`); `Emulation.setEmulatedMedia` (line 157); computed
  contrast via `getComputedStyle` + WCAG relative-luminance formula (lines 166–174). App code
  inspected: `src/ui/player-view.js:121` gates `announce()` on `SENTENCE_END` — behavior confirmed.

## Findings

1. **FALSE honesty claim (blocking).** Header lines 80–85 + step label line 108 + the module
   report assert: "this chrome-headless-shell build ignores CDP Input.dispatchKey entirely
   (probed: rawKeyDown+char into a focused input yields zero events)" and "OS-trusted key pipeline
   coverage is impossible headlessly here". **My probe against the same binary disproves both**:
   ```
   PROBE RESULT: {"ev":["kd:a","doc-kd:a","kp","input"],"val":"a"}
   ```
   (rawKeyDown+char+keyUp into a focused input → keydown on element, keydown on document,
   keypress, input, value set). Note the report's method name is wrong — CDP has
   `Input.dispatchKeyEvent`, not `Input.dispatchKey`; a typo'd probe that got "method not found"
   would look like "ignores input". Fix: drive `press()` via `Input.dispatchKeyEvent`
   (rawKeyDown/keyUp with `windowsVirtualKeyCode`+`text`), re-run; update the header note, the
   line-108 label, and `.autoforge/execution/M-F06A.md` to match reality.

2. **Focus check overclaims and could be strictly stronger (blocking, same root cause).** The
   "controls focusable in DOM order" proof is programmatic `el.focus()` (lines 136–147) plus the
   argument "Tab follows DOM order for native controls by spec". That argument is *reasonable in
   isolation* (no positive `tabindex` in the selected set; app's document keydown handler at
   `player-view.js:177` has no Tab case → no preventDefault-on-Tab) — but it is a theoretical
   argument, not a proof, and it silently misses the realistic regressions (inert ancestors,
   focus traps, handler-level Tab interception). It was also **unnecessary**: real Tab traversal
   works headlessly —
   ```
   TAB PROBE: ["b","c","BODY"]   # real Input.dispatchKeyEvent Tab: a -> b -> c -> body
   ```
   Fix: walk the real Tab sequence with trusted input; keep programmatic focus only as a fallback
   if some stop is legitimately skipped.

3. **Announcement upper bound is non-discriminating (needs fix).** The check claims "fires at
   sentence boundaries only" with `1 <= distinct <= 12` over a 3.0s window (100×30ms). Derivation
   vs real constants: calibration = 6 sentences × 14 words; defaults `wpm:300` (`src/app.js:19`),
   `chunkSize:2` (`src/app.js:20`); fresh user-data-dir ⇒ defaults apply. Sentence-only ⇒ at most
   ~3 distinct in-window (1 carryover + ≤2 boundaries at 2.8s/sentence) — so ≤12 can never fail
   on the sentence-only side. But a per-chunk-announce regression yields ~8 chunks in 3s
   (5 words/s ÷ 2) ⇒ ~8 distinct — **≤12, so it passes**. The bound catches nothing at default
   settings; it is headroom against the total sentence count, not against chunk counts. Lower
   bound ≥1 is sound (live-region text persists once set ⇒ robust, no flake). Fix: tighten to ≤5
   (still ≥2× headroom over the ~3 in-window maximum) or lengthen the window past ~5s; document
   the arithmetic in a comment so it stops being magic.

4. **Minor.** `const tab = null;` (line 87) is dead code left from the abandoned Tab path. The
   contrast check samples only `body` color/background (real ratio 18.88, but narrow — per-control
   text on tinted surfaces is unchecked; fine to note as scope, or extend later).

5. **What is genuinely good (keep).** Zero-dep CDP harness, no mock path, real import→open→play
   flow, real live region sampled from the DOM, `Emulation.setEmulatedMedia` for reduced motion
   with a real reload, page-exception capture, path-traversal guard in the static server
   (`fp.startsWith(REPO)`), best-effort report JSON. The app-side behaviors it verified are
   independently confirmed by code inspection (`SENTENCE_END` gate, no Tab interception).

## Required changes (precise)

1. Replace synthetic `document.dispatchEvent` keyboard proof with `Input.dispatchKeyEvent`
   (rawKeyDown+keyUp, correct VK codes/text); re-run; report real outputs.
2. Add a trusted-Tab traversal check (DOM-order stops); keep programmatic focus only as fallback.
3. Tighten announcement bound to ≤5 (or extend sampling window ≥5s); add the derivation comment.
4. Correct the header note, step labels, and `.autoforge/execution/M-F06A.md` honesty claim;
   delete dead `const tab = null;`.
5. Re-run `node scripts/a11y-checks.js`; paste raw output into the execution report.

Note for the record: no app regression was found — findings 1–3 are harness-claim/test-strength
defects, not product defects. The human-only remainder (real screen-reader listening, M-F06H)
remains genuinely human-only and is correctly deferred.
