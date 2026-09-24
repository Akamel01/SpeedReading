# Review — M-P03A persistence-v2 (round 2, post-repair)

- Reviewer: autoforge-reviewer (independent, read-only)
- Date: 2026-09-23
- Verdict: **CHANGES_REQUIRED** (1 blocker, 2 major)

## Evidence (re-run by reviewer)

| Check | Result |
|---|---|
| `CHROME_PATH=... node scripts/harness-run.mjs test/harness/store-v2.html --assert` | 10/10 PASS, `0 failures`, exit 0 (pasted below) |
| `node --test` | `tests 175, pass 175, fail 0` |
| `CHROME_PATH=... node .autoforge/validation/e2e-walkthrough.mjs` | 5 runs: `51 passed, 1 failed` ×3 (only `/tmp/pg1342.epub`), `42 passed, 2 failed` ×2 (EPUB + TypeError flake, 8 steps lost) |
| `node scripts/export-import.js` (pre-existing M-F05/ADR-15 acceptance) | `4 passed, 1 failed`, **exit 1** — `FAIL export: snapshot downloads with schema + records — texts=1 sessions=0` |
| Independent CDP probe (temp script outside repo, real store) | wipe → seed `{id:'keep-me'}` → `importAll({schemaVersion:2,texts:[{title:'no id here'}],...})` → `{"importResult":{"ok":false,"error":"invalid-record:texts[0]"},"survivingIds":["keep-me"]}` |
| `scripts/harness-run.mjs` source read | real: spawns Chrome (`:63-66`), CDP `Runtime.evaluate('window.__HARNESS__')` (`:116`), exit 1 on failure (`:144`), exit 1 on crash (`:149`) |
| `test/harness/store-v2.html` source read | real: dynamic-imports `../../src/lib/store.js` + `profile.js`, real IndexedDB; no mock, no window shims |
| `rg '__speedreadProfile\|__resumeCandidate' src/ index.html` | no hits; only local `resumeCandidate` const (`src/app.js:69`) |

Harness output (excerpt): `PASS activeSession round-trips and clears — {"sessionId":"s1",...,"savedAt":2}` / `PASS upgrade-abort: openStore rejects and prior data stays readable — rejected=true` / `PASS test/harness/store-v2.html (0 failures)`, `EXIT=0`.
Walkthrough resume lines: `PASS resume: pagehide writes profile.activeSession — {"sessionId":"09021ee0-...","textId":"f6338e39-...","chapterIndex":1,"chunkIndex":0,"wpm":300,"chunkSize":2,"elapsedMs":3,"startedAt":1790205165607,"savedAt":1790205165610}` / `PASS resume: session record clears profile.activeSession — snapshot=null`.

## Findings (ranked)

### BLOCKER 1 — pre-existing export/import acceptance is red: superseded assertion not updated
`scripts/export-import.js:135` asserts `snapshot.schemaVersion === 1`; store v2 exports 2, so the script now exits 1 (`4 passed, 1 failed`). Ticket `07-persistence-v2.md:14` requires "the existing v1 export/import acceptance is preserved" (work order objective likewise). ADR-23 supersedes the v1 *export freeze* (decisions.md:194,492,541), so the intended state is v2 export + v1 import still accepted — but nobody updated the assertion.
Fix (1 line, then re-run expect 5/5 exit 0): `scripts/export-import.js:135` `schemaVersion === 1` → `schemaVersion === 2`. If deferral to M-P08A (plan:246 owns the file) is intended, record an explicit waiver in `state.json` — do not leave the gate red silently.

### MAJOR 2 — pause and exit-without-end snapshot writes missing (ADR-23 §230, work-order objective)
ADR-23 §230 / decisions.md:230 freezes writes on **pause, `visibilitychange hidden`, `pagehide`, and exit-without-end**. Implemented: hidden (`src/app.js:407-412`), pagehide (`:414-416`), beforeunload (`:417-419`). Missing: pause — `src/ui/player-view.js:230` calls `player?.toggle()` with no callback, and `src/lib/player.js:45-46,101,107` already emits `state` events that `src/app.js` never subscribes to; exit — `src/app.js:316-319` pauses and shows library without `takeSnapshot()`. Consequence: exit→library (and pause→tab stays open) loses the resume point until a real page hide; M-P05B's acceptance "exit → boot → Resume → paused at restored chunk" (plan:195) depends on this.
Fix: in `src/app.js`, subscribe to the player state event (`playing === false` → `takeSnapshot()`), or add an `onPause` callback to `createPlayerView`; call `takeSnapshot()` in `onExit` before `show('library')`. ~6 lines.

### MAJOR 3 — walkthrough gate is flaky (pre-existing; aborts 8 steps when it fires)
`.autoforge/validation/e2e-walkthrough.mjs:514-515`: after `Page.reload` it waits only for `#view-library` visible, then immediately clicks `.library-item button[data-action="open"]`; the item is rendered asynchronously from IDB, so the click intermittently hits `null` → `TypeError: Cannot read properties of null (reading 'click')`, recorded as `walkthrough: unexpected failure` and aborting the remaining ~8 steps (52→44). Observed 2/5 runs (25-40%). This step is unchanged from HEAD (pre-existing), not a regression, but it makes the module gate non-deterministic and violates the "only acceptable failure is /tmp/pg1342.epub" rule.
Fix: at `:514`, `waitFor` the item itself before clicking — `document.querySelector('#view-library .library-item button[data-action="open"]')` with 10s timeout.

### MINOR 4 — malformed profile in v2 import is silently dropped, not rejected
`src/lib/store.js:157-162`: when `json.profile !== undefined` the profile store is cleared, then records are put only `if (p && p.id)` — a malformed profile (e.g. `{junk:true}`) clears the local profile (losing `seenAchievements`/`activeSession`) and is silently skipped, contradicting "malformed record rejected". Store records are validated first (`:131-140`); profile is not.
Fix: validate `json.profile` (object/array of objects with `id`) before the tx and return `invalid-record:profile`; keep the clear only for validated input.

### MINOR 5 — dead code in profile.js
`src/lib/profile.js:5-28` `ensureProfile` is never called (load/save handle creation). Delete it.

### MINOR 6 — ADR-23 §230 "readEvents reset at snapshot" not implemented
`src/app.js:91-110` snapshots `elapsedMs = activeMs(readEvents)` without resetting `readEvents`. Current behaviour is arguably safer for the same-page record path (no double-count), but it deviates from the frozen text; either note the supersession in ADR-23 or have M-P05B seed elapsed from the snapshot without re-adding pre-snapshot events.

### MINOR 7 — `resumeCandidate` read but unused
`src/app.js:69` loads the boot candidate; no consumer yet (discard-if-missing-`textId`, offer Resume). Acceptable if M-P05B owns consumption — state it in the handoff so it is not lost.

## Verified good

- Harness runner is real (no mock): serves repo, launches Chrome, reads `window.__HARNESS__`, `--assert` exits 1 on failure; harness page uses live `store.js`/`profile.js` and real IndexedDB.
- `src/lib/store.js`: `VERSION = 2` (`:15`), additive upgrade keeps existing stores (`:18-26`), `exportAll` → `{schemaVersion:2,...,profile}` (`:86`), import accepts 1|2 (`:108,125`), validate-before-clear (`:131-140` before tx `:142`), `invalid-record:<store>[i]` (`:137`), dedupe by id (`:151-155`), `schema-mismatch` (`:106,128`), writes resolve on commit (`:44-57`).
- `src/lib/profile.js`: ADR §13 surface present (`:100-107`), corrupt → defaults + `recovered:true` (`:35-50,53-67`), `markSeen` idempotent and returns the profile (`:79-85`), one `id:'local'` record.
- `src/app.js`: no window globals; snapshot shape exactly `{sessionId,textId,chapterIndex,chunkIndex,wpm,chunkSize,elapsedMs,startedAt,savedAt}` (`:96-106`); cleared on record (`:198`); session id minted once (`:147`) and reused by the record (`:179`); corrupt-store banner path + Retry (`:448-463`, `index.html:43`).
- Independent probe: missing-`id` record rejected with `invalid-record:texts[0]` and existing data intact — the key ADR-23 safety property holds.
- `node --test` 175/175.

## Verdict

**CHANGES_REQUIRED** — blocker 1 is a one-line stale assertion that leaves the pre-existing acceptance gate red; majors 2 (pause/exit snapshot writes) and 3 (walkthrough flake) should be fixed in the same repair wave since both are small and both affect later module gates (M-P05B resume; final harness state).
