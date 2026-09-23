# Re-review: ui-player-view (round 2)

- Date: 2026-09-22
- Role: autoforge-reviewer (read-only)
- Scope read: `src/ui/player-view.js`, `test/harness/player-view.html`, `src/lib/player.js`, `src/ui/a11y.js`, `styles/app.css`
- Prior review: `.autoforge/reviews/ui-player-view.md` (CHANGES_REQUIRED, a11y gate 4 FAIL)

## Verdict: CHANGES_REQUIRED

All prior blockers in `src/ui/player-view.js` are fixed. The harness blocker (prior finding 6, and the gate condition "resolved and demonstrated in the harness") is **not** fixed: the harness emitter is still a no-op against the real player and still uses payload shapes that do not match the real contract. Gate 4 cannot pass without a harness that actually drives the module.

## Evidence

Commands (workdir repo root):

```
$ node --check src/ui/player-view.js
SYNTAX_OK

$ python3 -m http.server 8091 & curl -s -o /dev/null -w "%{http_code}"
harness:200  view:200  player:200

$ grep -nE "document\.getElementById|id =|createPlayer\(|setTimeout|setInterval|requestAnimationFrame|wpmDelta|togglePlay" src/ui/player-view.js
exit:1            # zero matches: no id creation, no own player/timers, no invented API names

$ grep -n "addEventListener" src/ui/player-view.js
148..152  fontSel/alignSel/orpToggle/chunkSel/motionSel 'change'
158..174  playBtn/prevBtn/nextBtn/slowerBtn/fasterBtn/exitBtn/srPrev/srNext 'click'
176       document.addEventListener('keydown', ...)   # one, in the factory
```

Key lines quoted:

- aria-hidden, stage only: `stage.setAttribute('aria-hidden', 'true');` (`player-view.js:32`). Interactive `controls` (`:44-60`), `settingsRow` (`:62-89`), and `srPanel` (`:92-107`) are separate siblings, never inside `stage`.
- Transport is the real API: `playBtn.addEventListener('click', () => player?.toggle());` (`:158`), `player?.step(-1)` (`:159`), `player?.step(1)` (`:160`). WPM changes go only through `onSettingsChange?.({ wpm: ... })` (`:161`, `:162`, `:196`, `:201`). No `togglePlay`/`prev`/`next`/`wpmDelta`.
- Chunk payload, real shape: `const { index, chunk, orpParts } = event;` (`:225`), matching `emit('chunk', { index, chunk, orpParts: ... })` (`player.js:71`) and the documented event contract (`player.js:4`). `renderChunk` reads `chunk.words`, `chunk.text`, and an `orpParts` array (`:112-122`).
- Settings listeners: `fontSel.addEventListener('change', () => onSettingsChange?.({ fontScale: Number(fontSel.value) }));` … `chunkSel`/`motionSel` (`:148-155`).
- `renderSettings` reflects persisted values into all five controls (`:253-257`) and syncs `--font-scale`: `root.style.setProperty('--font-scale', String(settings.fontScale));` (`:130`), consumed by `font-size: calc(16px * var(--font-scale));` (`styles/app.css:19`). `.rsvp-stage` owns the grid (`styles/app.css:40-43`); the view sets no `display` property anywhere (grep `display` exit 1), so no inline override.
- `prefersReducedMotion()` used at `:154`, `:219`, `:260`; SR/manual panel toggled via `srPanel.hidden` (`:138-141`).
- `hide()`: `root.hidden = true;` then `player?.pause();` (`:246-249`).
- Keydown listener attached once, inside the factory (`:176`), with hidden guard (`:177`).

## Findings

1. **BLOCKER — harness emitter still a no-op (prior finding 6 unresolved).** `emit()` checks `typeof player.dispatchEvent === 'function'` then `typeof player.emit === 'function'` (`test/harness/player-view.html:35-38`). `createPlayer` returns a plain object exposing `on(event, cb)` (`player.js:129-133`), so both are undefined and no `chunk`/`state`/`end` event ever reaches the view. The harness therefore exercises nothing, and the gate's "demonstrated in the harness" condition fails.
2. **BLOCKER — harness uses wrong input/payload shapes even if the emitter were fixed.** `view.start({ player, text: sampleText })` passes a string (`player-view.html:30`), but the view reads `text?.title` / `text?.text` (`player-view.js:218`, `:220`) — header falls back to "Reading" and `sentences` is empty. Chunk payloads `{ left: 'A', mid: '→', right: 'B' }` (`player-view.html:42-44`) are not the real `orpParts: [{left, orp, right}]` array, and the state payload `{ isPlaying: false }` (`:51`) is not `{ playing, wpm }` (`player.js:46`). Harness output cannot validate the real contract.
3. **Fixed — a11y gate 4 primary blocker cleared.** aria-hidden is confined to the visual stage (`player-view.js:32`); all buttons, selects, checkbox, and SR nav are outside it. No `id` is created anywhere in the view (grep exit 1), so the prior duplicate-`#view-player` issue is gone. `hide()` now uses `root.hidden` (`:246-249`).
4. **Fixed — API/payload/settings wiring matches `player.js`.** Only `toggle`/`step`/`on`/`play`/`pause`/`getState` are called; WPM edits route exclusively through `onSettingsChange({ wpm })`; chunk rendering consumes the real `{index, chunk:{words,text}, orpParts:[{left,orp,right}]}` shape; all five settings controls have change listeners and `renderSettings` reflects persisted values including the numeric `--font-scale` multiplier.
5. **MINOR — no listener teardown, benign today.** The keydown listener and `player.on(...)` subscriptions are never removed; the keydown guard `if (root.hidden) return;` (`:177`) makes it inert when hidden, and the listener is attached once per `createPlayerView` call (not per `start()`), so this is acceptable provided the shell constructs the view once. If `start()` is ever called twice with the same player instance, `player.on` listeners would stack (`:224-234`) — add an unsubscribe if that usage appears.

## Required changes

1. Rewrite `test/harness/player-view.html` to drive the real API: either build a real player with actual chunks (`createPlayer({ chunks, wpm })`) and let playback emit events, or subscribe with `player.on('chunk', cb)` / `player.on('state', cb)` and invoke the callbacks with real payloads (`{ index, chunk: { words, text }, orpParts: [{ left, orp, right }] }`). Drop the `dispatchEvent`/`emit` probing.
2. Pass the real text object to `start`: `view.start({ player, text: { title: 'Chapter 1', text: sampleText } })`.
3. Use real state payloads (`{ playing, wpm }`) and, where applicable, the real `orpParts` array shape.

Re-run after fix: `node --check src/ui/player-view.js`, serve 8091, and confirm the harness renders chunk/progress/announce and logs settings-change from real events.

## Artifact

`.autoforge/reviews/ui-player-view-r2.md`
