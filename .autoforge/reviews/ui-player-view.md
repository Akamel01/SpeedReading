# Review: `ui-player-view` (M12)

- Reviewer: autoforge-reviewer (independent; worker report not trusted)
- Reviewed at: working tree state, 2026-09-22
- Scope read: `src/ui/player-view.js`, `test/harness/player-view.html`, `src/lib/player.js`, `src/lib/text.js`, `src/ui/a11y.js`, `plan.md` §1a/§1b/§1c/M12, ADR-7 (`decisions.md:43-47`), `index.html`, `styles/app.css`

## Verdict: CHANGES_REQUIRED

Blocked at accessibility gate 4 (hard stop). Module structure exists and the injected-player/no-timer invariant holds, but the ARIA strategy fails WCAG 4.1.2, keyboard/click wiring targets methods the injected player does not have, and the sentence-boundary/SR event path can never fire with real data. All are fixable in-place; no redesign needed.

## Checks run (real output)

### 1. Syntax + serve

```
$ node --check src/ui/player-view.js && echo CHECK_OK
CHECK_OK

$ python3 -m http.server 8094   # background
$ curl -s -o /dev/null -w "harness HTTP %{http_code}\n" http://127.0.0.1:8094/test/harness/player-view.html
harness HTTP 200
$ curl -s -o /dev/null -w "module HTTP %{http_code}\n" http://127.0.0.1:8094/src/ui/player-view.js
module HTTP 200
$ curl -s http://127.0.0.1:8094/test/harness/player-view.html | grep -c "createPlayer"
6
```

### 2. Static audit (grep, quoted hits)

- `createPlayer(` inside `src/ui/player-view.js`: **absent** — injected-player contract holds.
- `setTimeout|setInterval|requestAnimationFrame` in `src/ui/player-view.js`: **absent** — no view-owned timer.
- `document.addEventListener`: absent. Only hit is `player-view.js:196` `window.addEventListener('keydown', _handleKey)` — inside `start()`, not at import time. Pass.
- `player-view.js:37` `container.setAttribute('aria-hidden', 'true')` — present, but see Finding 1.
- `player-view.js:158` — the only `announce(` call site; see Finding 3.
- `store|fetch` in `player-view.js`: **absent**.
- All switch cases in `_handleKey` call `ev.preventDefault()` (lines 247, 256, 260, 265, 271, 275). Pass.
- No `addEventListener('change'` / `'input'` anywhere in the file (grep: no matches) — see Finding 4.

### 3. Harness

- Imports both real modules (`player-view.html:11,13`); title and sample text present (`:29`). Pass on structure.
- But its `emit()` helper can never deliver events: `createPlayer({})` returns a plain API object. Verified:
  ```
  $ node --input-type=module -e "import { createPlayer } from './src/lib/player.js'; const p = createPlayer({}); console.log('dispatchEvent:', typeof p.dispatchEvent, '| emit:', typeof p.emit, '| on:', typeof p.on, '| toggle:', typeof p.toggle, '| togglePlay:', typeof p.togglePlay); console.log('methods:', Object.keys(p).join(','));"
  dispatchEvent: undefined | emit: undefined | on: function | toggle: function | togglePlay: undefined
  methods: play,pause,toggle,seek,step,setWpm,getState,on
  ```
  Harness `emit()` checks `dispatchEvent` then `emit` (`player-view.html:35-38`) — both undefined, so it is a no-op. The view is never exercised on `chunk`, and the harness would not catch Findings 2-3.

### 4. Adversarial probes (actual reads)

- **Player without `state` events**: safe — `onState` only updates a label (`player-view.js:178-182`); no dependency in `start()`.
- **Long chunk / ORP positioning**: fails acceptance. Stage is created with inline `display:flex` (`player-view.js:47`), which overrides `styles/app.css:41-42` `display:grid; grid-template-columns:1fr auto 1fr` — ORP char does not stay at fixed x as word length varies.
- **Implicit timer paths**: none in this file; all playback delegates to injected player.
- **`hide()` idempotent**: yes — `player-view.js:208-211` only sets `display:none` and `isVisible=false`; repeated calls are safe. But it never sets/restores the `hidden` attribute (contract/§1b: inactive views carry `hidden`), and `showSrText`/`start` do not re-add `hidden` on the section that `index.html:29` ships pre-hidden.
- **Duplicate root id**: `index.html:29` already ships `<section id="view-player" hidden aria-hidden="true">` (shell-owned), while `ensureDom()` creates a second `<section id="view-player">` (`player-view.js:35`) and appends it to root — duplicate id in the live document.
- **Restart safety**: every `start()` adds another `window` keydown listener (`:196`) with no removal path; handlers multiply on restart.
- **Chunk payload shape**: `player.js:71` emits `{index, chunk, orpParts}` where `chunk` is the text-layer object `{words, text}` (`text.js:144`), not a string.

## Findings (6)

1. **[BLOCKER — gate 4] `aria-hidden="true"` wraps interactive controls.** `player-view.js:37` hides the entire container, but the real `<button>`/`<select>` controls live inside it (`:53-67`). Focusable elements inside an `aria-hidden` subtree violate WCAG 4.1.2 / ADR-7 ("all controls real buttons with labels"): SR users can tab into an invisible-from-AT controls region, and no labeled control is reachable. Fix: apply `aria-hidden` only to the decorative RSVP display (stage + progress), keep the controls region exposed with labels, or move controls outside the hidden node.
2. **[BLOCKER] Keyboard/click wiring targets methods the injected player does not have.** `player-view.js:248,257,261,286,289,292` call `togglePlay`/`prev`/`next`; verified `createPlayer` exposes `toggle`/`step(delta)` only (`player.js:101,118`; runtime keys above). With the real player Space/←/→ are silent no-ops (Space degrades to a label flip, `:249-253`). Also ± keys/buttons send invented `{wpmDelta:±25}` (`:267,272,295,298`), which is not a settings partial per §1a and is never forwarded to `player.setWpm`. Fix: use `toggle`/`step(-1)`/`step(+1)`; route WPM through the documented settings path.
3. **[BLOCKER] Announce and SR sentence buffering can never fire on real data.** `player-view.js:157,161` gate on `typeof chunk === 'string'`, but chunk events carry `{words, text}` objects (`player.js:71`, `text.js:144`). So `announce('Sentence boundary reached.')` is unreachable and the reduced-motion `sentencesBuf` never fills — `srLive` stays empty. Fix: read `chunk.text` (or reconstruct from `chunk.words`) and test the trailing-punctuation regex against that.
4. **[MAJOR] Settings controls are inert.** No `change`/`input` listeners exist on `fontScaleSel`, `alignSel`, `orpHighlightCb`, `chunkSizeSel`, `reducedMotionSel`; `_bindControlClicks()` (`:283-314`) binds buttons only. The §1a contract "settings controls … report changes through `onSettingsChange(partial)`" is unmet; `onSettingsChange` is only echoed from `renderSettings` (`:234-236`), which risks a render loop if the caller re-renders on that signal. Fix: bind `change` on each control and emit `{fontScale|textAlign|orpEnabled|chunkSize|reducedMotion}`; do not echo from `renderSettings`.
5. **[MAJOR] Reduced-motion detection and settings tokens diverge from contract.** `prefersReducedMotion` is imported (`:4`) but never called; mode only activates when `settings.reducedMotion === 'on'` (`:215`). ADR-7/acceptance require defaulting to sentence mode under `prefers-reduced-motion: reduce`. Separately, `--font-scale` is written as `"100%"` (`:119,224`) while `styles/app.css:14` consumes it as a number in `calc(16px * var(--font-scale))` — invalid at computed-value time, so font scaling has no visual effect and the "two font scales" acceptance check fails. `--text-align` (§1b) is not used; the view sets `container.style.textAlign` (`:120,225`) directly.
6. **[MINOR / test integrity] Harness does not drive the module; duplicate id + hidden drift.** Harness `emit()` is a no-op against the real player (see check 3), so the harness reports success while the view's event path is untested. Plus: duplicate `#view-player` (`index.html:29` vs `player-view.js:35`), `hide()` not using the `hidden` attribute (`:209`), and a new `window` keydown listener per `start()` with no teardown (`:196`).

## Required changes (all must land before re-review)

1. Move `aria-hidden` off the interactive subtree; give every control an accessible name; re-verify tab order.
2. Map keyboard/click actions onto `toggle`/`step`/`setWpm` as exposed by `src/lib/player.js`; define WPM change signaling with the app owner (no `wpmDelta` key unless §1a is amended).
3. Gate sentence-boundary logic on `chunk.text`/`chunk.words`; add a harness case proving announce fires only at `.!?` boundaries and the SR line advances.
4. Bind `change`/`input` handlers for all five settings controls; `renderSettings` must reflect without re-emitting.
5. Wire `prefersReducedMotion()` into the default-mode decision; set `--font-scale` as a unitless number and `--text-align` via custom property (or amend §1b with the app owner); drop the inline `display:flex` so the grid ORP anchor applies.
6. Fix the harness emitter (drive the real `player.on('chunk', …)` path), remove the duplicate `#view-player` creation (append into the shell-provided section), make `hide()` toggle `hidden`, and remove the keydown listener on hide or guard against re-subscription.

**Gate status: a11y gate 4 FAIL until findings 1, 2, 3, 5 are resolved and demonstrated in the harness.**
