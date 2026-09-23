# Review: ui-player-view (r3 — harness repair re-review)

Scope: `test/harness/player-view.html` harness-only repair. Prior verdicts: r1 CHANGES_REQUIRED, r2 CHANGES_REQUIRED (harness drove no real player; wrong shapes; string `text`).

## Verdict: APPROVED_WITH_NOTES

Browser-level interaction deferred to verify-acceptance (as scoped); code + library runtime evidence below.

## Findings

1. Real API wired. `import { createPlayerView } ...` (`:10`), `import { createPlayer } from '../../src/lib/player.js'` (`:11`), `import { tokenize, chunk } from '../../src/lib/text.js'` (`:12`). Subscription via real emitter: `player.on('chunk', ...)` (`:29`), `player.on('end', ...)` (`:30`). Real `start` object: `view.start({ player, text });` (`:32`) with `text = { title, text }` (`:21-24`). `renderSettings` refills all controls (`:33`). Grep counts all 0: `CustomEvent` 0, `dispatchEvent` 0, `emit(` 0, `setTimeout` 0.
2. Serve + syntax green. HTTP 200: `test/harness/player-view.html`, `src/lib/player.js`, `src/lib/text.js`, `src/ui/player-view.js`. `node --check src/ui/player-view.js` = OK. No view regression: `player?.toggle()` (`player-view.js:158`), `player?.step(-1)` (`:159`), `player?.step(1)` (`:160`), `onSettingsChange?.({ wpm: Math.max(60, currentWpm - 25) })` (`:161`). shasum: `5189df4b0c97040e16ec3b55f460bdbd0ca0824e86b81050c9a7a8cccf5569e0  src/ui/player-view.js`; harness `443d0da93c2b2b73ae68b13dc660bd442c0157ec07fe1b31283f390516ce37ea`. No baseline hash was recorded in r2, so byte-identity vs r2 rests on unchanged reviewed content + the greps above, not a stored hash.
3. Real chunk event path confirmed. `view.start` auto-plays when not sr-mode (`player-view.js:235`); Play click calls `player?.toggle()` (`:158`) → `player.play()` → `emit('chunk', { index, chunk, orpParts })` (`player.js:71`). Node pipeline using the exact harness construction (`chunk(tokenize(...), { size: 2 })` → `createPlayer({ chunks, wpm: 300 })` → `player.on('chunk')`) emitted real payloads: `{"index":0,"orpParts":{"left":"T","orp":"h","right":"is"},"text":"This is "}` and ran all 7 chunks to `end`. Browser click-through not executed here; deferred to verify-acceptance.

## Notes

- `chunk` size 2 with wpm 300 gives a 400 ms first-chunk delay; harness produces 7 chunks, so `[HARNESS] chunk` lines appear shortly after load even without a click (auto-play), and on Play under reduced-motion emulation.
