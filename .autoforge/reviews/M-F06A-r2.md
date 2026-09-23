# Review M-F06A-r2 — a11y-checks.js re-review after CHANGES_REQUIRED

**Verdict: APPROVED**

Reviewer ran the script itself (not worker evidence). Date: 2026-09-23.

## 1. Own run — exit code + step lines

```
PASS  keyboard: trusted Space toggles playback
PASS  keyboard: arrows/+/- handled, single view kept
PASS  announce: live region fires at sentence boundaries only — distinct announcements=2
PASS  focus: trusted Tab stops are labelled controls with visible outline — 13 stops checked
PASS  keyboard: Esc exits player to library
PASS  reduced-motion: manual sentence mode, no autoplay
PASS  contrast: body text >= 4.5:1 — ratio=18.88
PASS  page: zero uncaught page exceptions

8 passed, 0 failed
EXIT=0
```

- Space step no longer says "handler-level": label is now `keyboard: trusted Space toggles playback`. Fixed.
- `pkill -f chrome-headless-shell` run first; ports 8132/9352 free; clean run on first attempt.

## 2. Static checks

```
$ grep -n "Input.dispatchKeyEvent\|dispatchKey\b" scripts/a11y-checks.js
80:  // Trusted input via CDP Input.dispatchKeyEvent (reviewer-verified to work on this
83:    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ... }, sid);
84:    if (key.length === 1) await send('Input.dispatchKeyEvent', { type: 'char', ... }, sid);
85:    await send('Input.dispatchKeyEvent', { type: 'keyUp', ... }, sid);

$ grep -n "const tab = null" scripts/a11y-checks.js
(no matches, exit 1)
```

- Correct method `Input.dispatchKeyEvent` only; no wrong-method variant. Fixed.
- Dead `const tab = null` gone; the surviving `const tab = () => press('Tab', 'Tab', 9)` (line 87) is live — used by the Tab walk at line 141. Fixed.
- Derivation comment present, lines 129–131: `3s window at ~1500wpm ... ≤5 distinct announcements; a per-chunk regression would produce double digits in-window`. Bound enforced at line 132: `seen.length >= 1 && seen.length <= 5`. Fixed.
- Untracked file (`?? scripts/a11y-checks.js`); no commit expected for this module.

## 3. Independent trustworthiness check (different method)

Evidence chain, independent of the script's own claims:

1. Toggle listener target is `document` — `src/ui/player-view.js:177 document.addEventListener('keydown', ...)`; Space branch (line 182) calls `player?.toggle()`. No `isTrusted` gate.
2. The script contains **no** synthetic keyboard path: `grep "KeyboardEvent|dispatchEvent|toggle()"` matches only line 98 (`input.dispatchEvent(new Event('change'...))`, the file-import shim). No `new KeyboardEvent`, no direct `player.toggle()` call, no click on `.player-btn-play`.
3. Therefore the only mechanism that could flip Pause→Play in my run is a keydown delivered through the browser input pipeline, which `Input.dispatchKeyEvent` injects as trusted (`isTrusted: true`).

Honest nuance (note, not blocker): the app does not *enforce* `isTrusted`, so a synthetic `document.dispatchEvent(new KeyboardEvent(...))` would also toggle. What the fix actually proves is that real browser input reaches the document listener and the real user path works — which is the point of the original finding. The run's trusted dispatch + label flip is sufficient evidence; no further probe needed.

## Findings

1. **Fixed** — trusted input via `Input.dispatchKeyEvent` (lines 83–85); label claim matches mechanism, no "handler-level" wording remains.
2. **Fixed** — focus proof is a trusted Tab walk (`tab()` → `press('Tab','Tab',9)`), 13 stops, all labelled native controls with visible outline; 0 bad stops.
3. **Fixed** — announcement bound tightened to `<= 5` with in-code derivation; my run measured `distinct announcements=2`.
4. **Note** — app does not gate keydown on `isTrusted`, so the script's trusted path is stronger than the app's own requirement; nothing to change, recorded so the claim is not overstated.

Read-only review; no code mutated.

Artifact: `.autoforge/reviews/M-F06A-r2.md`
