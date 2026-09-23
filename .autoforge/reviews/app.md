# Review — M14 `app` (`src/app.js`)

Reviewer: autoforge-reviewer (read-only). Date: 2026-09-22.
Contract basis: `plans/plan.md` §1 (interface freeze), §1a (UI contracts), §1b (DOM contract), §1c (invariants), §2 M14 acceptance; `architecture/decisions.md` §4 (data model), §3, ADR-8, ADR-9. M15 expectations cross-checked at `validation/e2e-report.json`.

## Verdict

**APPROVED_WITH_NOTES**

No contract violation found: syntax clean, full suite green, every import resolves to a real named export, view constructor signatures and callbacks match §1a, data records match §4 field-for-field, and the §1c invariants hold for `app.js`. Three medium issues are evidence-backed (one is a **plan gap**, not a code defect). Two low-severity robustness notes.

---

## Checks run (real output)

### 1. Syntax + tests

```
$ node --check src/app.js
(exit 0)
$ node --test
ℹ tests 75
ℹ pass 75
ℹ fail 0
```

Matches M14 acceptance "`node --test test/` all green". (`package.json` is `{"type":"module"}` per §1b; ESM resolution deterministic.)

### 2. API compatibility — every import exists

app.js:4-13 imports, each verified against a real export line:

| app.js import | exporter |
|---|---|
| `openStore` | `src/lib/store.js:7: export async function openStore()` |
| `ingest` | `src/lib/pipeline.js:107: export async function ingest({ name, arrayBuffer })` |
| `tokenize`, `chunk` | `src/lib/text.js:5`, `src/lib/text.js:96` |
| `createPlayer`, `nextDelay` | `src/lib/player.js:16`, `src/lib/player.js:8` |
| `generateQuiz`, `scoreQuiz` | `src/lib/quiz.js:27`, `src/lib/quiz.js:125` |
| `suggestNextWpm` | `src/lib/metrics.js:73` |
| `createLibraryView` | `src/ui/library.js:1` |
| `createPlayerView` | `src/ui/player-view.js:17` |
| `createQuizView` | `src/ui/quiz-view.js:7` |
| `createDashboard` | `src/ui/dashboard.js:7` |

No missing/renamed export. View contracts vs §1a match verbatim:
`createLibraryView(root, {onImportFile,onOpenText,onDeleteText,onExport,onImportJson})` (library.js:1), `createPlayerView(root, {onSessionEnd,onExit,onSettingsChange})` (player-view.js:17), `createQuizView(root, {onSave,onCancel})` (quiz-view.js:7), `createDashboard(root, {onStartSession,onExport,onImportJson,onAcceptWpm})` (dashboard.js:7).
Callback payloads line up with view emit sites: `onSessionEnd?.({endedAt: Date.now()})` (player-view.js:235) → `onSessionEnd: ({ endedAt }) => recordSession(endedAt)` (app.js:166); `onStartSession?.(lastTextId)` (dashboard.js:51) → `onStartSession: (textId)` (app.js:218); settings partials `{fontScale|textAlign|orpEnabled|chunkSize|reducedMotion|wpm}` (player-view.js:149-163) all handled by the merge at app.js:175.
Store call shapes match `store.js` API construction (`put(store, rec)` store.js:58, `del(store, id)` store.js:72, `getAll(store)` store.js:67, `exportAll()` store.js:77, `importAll(json)` store.js:88).

### 3. Data model vs §4

Session record (app.js:108-123) — all §4 fields present, no extras:

```js
currentSession = {
  id: crypto.randomUUID(),
  kind, textId: currentText.id, chunkSize: settings.chunkSize, targetWpm: settings.wpm,
  startedAt, endedAt, wordCount, elapsedMs, wpm,
  quizId: null, correct: null, total: null, comprehensionPct: null,
};
```
§4: `{ id, kind:'baseline'|'read', textId, chunkSize:1|2|3, targetWpm, startedAt, endedAt, wordCount, elapsedMs, wpm, quizId, correct, total, comprehensionPct }` → match. `kind` derives from prior sessions of the same text (app.js:107), baseline-as-session per §4 line 142. `quizId/correct/total/comprehensionPct` write-back at app.js:196-203 matches.

Text record (app.js:142-149): `{id, title, source, importedAt, chapters, totalWords}` vs §4 `{ id, title, source:'txt'|'epub', importedAt, chapters:[{index,title,text,wordCount}], totalWords }` → match; `chapterize` emits `{ index, title, text, wordCount }` (pipeline.js:68).

Quiz record (app.js:187-194) vs §4 `{ id, textId, createdAt, seed, questions, edited }` → match (`edited: editedQuiz.edited === true`).

Settings defaults (app.js:15-24) vs §4:
```
{ id:'settings', wpm:300, chunkSize:2, orpEnabled:true, reducedMotion:'auto', fontScale:1, textAlign:'center', adaptiveSuggestions:true }
```
§4: identical (all 8 keys, same defaults). Boot also force-normalizes `id:'settings'` and re-persists (app.js:42-44), so a partial legacy record self-heals.

### 4. Invariants

```
$ grep -n "fetch(\|setTimeout\|setInterval\|XMLHttpRequest\|sendBeacon" src/app.js
exit=1        # no matches
```
Only timer/clock owner in `src/` is `player.js:23` (`requestAnimationFrame` / `setTimeout` fallback), which §1c(3) grants. Store is the sole IDB user:
```
$ grep -rn "indexedDB" src/
src/lib/store.js:13, src/lib/store.js:8        # only matches in src/
```
Exactly one visible section — `show()` hides every section each call (app.js:33-37):
```js
function show(name) {
  for (const [key, section] of Object.entries(sections)) {
    if (section) section.hidden = key !== name;
  }
}
```
All four sections start `hidden` (index.html:28-38); boot ends `show('library')` (app.js:258). Visibility pause (app.js:251-253):
```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) currentPlayer?.pause();
});
```
No telemetry/network path in app.js; `exportData` uses a Blob + object URL only (app.js:231-239).

### 5. Flow correctness (code reading, traced end to end)

import → `ingest` → text put → `libraryView.render` (app.js:138-155); open → tokens/chunks/player/view → `show('player')` (app.js:71-95); end → session put → quiz generated **after** the await of the session write (app.js:124-134), so a fast user cannot race the session record; quiz save → quiz put + session update by `id` keyPath (idempotent on double-submit: same `editedQuiz.id` overwrites, no duplicate row) → dashboard with `suggestNextWpm(currentSession.wpm, currentSession.comprehensionPct)` (app.js:205-208); accept → `settings.wpm` persisted + dashboard re-render (app.js:224-228). JSON import goes through the confirm before `importAll` (app.js:242-243) exactly as M14 acceptance requires ("calls `store.importAll` only after confirm"). No path double-records a session and no path leaves a section un-hidden.

### 6. Adversarial

- **Two rapid `onSessionEnd`** — no guard: `onSessionEnd: ({ endedAt }) => { recordSession(endedAt).catch(...) }` (app.js:166-168); each run mints a fresh `crypto.randomUUID()` session id (app.js:109) and a fresh quiz id (app.js:128), so two `end` events would create two session rows, two quizzes, and two `show('quiz')` calls. Currently unreachable: `finish()` is gated by `endEmitted` (player.js:48-53) and the app leaves the player view on the first `end`; a second `end` needs `play()` after `index >= list.length` (player.js:80 `replay after end restarts`), only reachable while `#view-player` is visible. Latent, engine-dependent.
- **Delete text while reading** — delete is only reachable from the library view (`onDeleteText` app.js:157-160), so no write targets a deleted text mid-play. But `onExit` (app.js:169-172) clears nothing: `currentText`/`currentPlayer` stay set after exit, and dashboard's remembered `lastTextId` (dashboard.js:110) can point at a text deleted afterwards → see Finding 1.
- **Import unsupported file** — `ingest` throws `UnsupportedFormatError('Unsupported file type: pdf')` (pipeline.js:133) → caught at app.js:152-154 → `alert("Import failed: ...")`; the library list is untouched. Correct.
- **Settings change while playing** — `wpm` is pushed into the live engine via `currentPlayer?.setWpm(settings.wpm)` (app.js:177-179); `chunkSize` is persisted but chunks are not rebuilt, which is right per ADR-8 ("fixed per session") — but the session row then records the *new* value, see Finding 2. `reducedMotion`/`fontScale`/`textAlign`/`orpEnabled` only affect presentation (player-view.js:149-156).

---

## Findings

**F1 (medium) — Dashboard "Start session" is a silent dead end when its remembered text is gone.**
`startBtn.disabled = lastTextId === null` (dashboard.js:128) where `lastTextId` comes from session rows (dashboard.js:110). Sessions outlive texts (`onDeleteText` deletes only `texts`, app.js:158). Reproduce: play sample → end → cancel quiz → dashboard → library → delete sample → dashboard (button still enabled) → click → `onStartSession(textId)` → `openText(id)` → `if (!text || !text.chapters.length) return;` (app.js:74) → nothing happens: no view change, no message, no `announce`. User-visible dead click with zero feedback. Fix instruction: in `onStartSession` either fall back to `show('library')` when `openText` cannot resolve, or make `openText` return a boolean and let the caller route + announce. (Cheap root-cause variant: `openText` returns `false` on the guard, caller does `if (!openText(textId)) show('library')`.)

**F2 (medium) — Session row records the post-change `chunkSize`, not the value actually used for the chunks.**
Chunks are built once at open with the then-current setting — `currentChunks = chunk(tokenize(currentChapter.text), { size: settings.chunkSize })` (app.js:77) — while `recordSession` reads the live closure value: `chunkSize: settings.chunkSize` (app.js:112). The player-view chunk select stays enabled during playback (`chunkSel.addEventListener('change', ...)` player-view.js:152), and `onSettingsChange` persists it without touching `currentChunks` (app.js:173-180). So a session played at 2 words records `chunkSize: 3` and inherits the dashboard "(experimental)" badge (dashboard.js:96-101) — a false measurement label, violating the ADR-8 consequence that 3-word results are *the* labeled-experimental ones. Fix instruction: capture `const sessionChunkSize = settings.chunkSize` in `openText` and use it in `recordSession` (one line each).

**F3 (medium, PLAN GAP — needs plan-owner decision, not a code patch) — only chapter 0 of any imported text is readable.**
`currentChapter = text.chapters[0]` (app.js:76) is the only assignment; the player title (app.js:92) and the quiz source (app.js:126) both use that chapter. No chapter control exists in the frozen §1a UI contract and no view file mentions "chapter" (`grep -rn chapter src/ui/` → no matches). Consequence: the M15 gate's own Gutenberg EPUB ("Pride and Prejudice (epub, 130614 words)", `validation/e2e-report.json`) exposes exactly one chapter; library shows 130,614 words (app.js:148) but only the first chapter's worth is playable. Not a §1a/§4 violation — the interface freeze has no chapter parameter — so this review does not treat it as a defect; it should be recorded as an MVP scope decision (accept "first chapter only", or amend §1a with a chapter selector in a follow-up wave).

**F4 (low) — `onSessionEnd` is not idempotent; `recordSession` has no in-flight guard.**
`recordSession(endedAt).catch((error) => console.error(error));` (app.js:167) will start a second, concurrent run on a second `end` event: both `await store.getAll('sessions')` (app.js:106), both `store.put` under different ids, both call `generateQuiz` and `quizView.start`. Unreachable today only because `player.js:49-51` (`if (!endEmitted) { endEmitted = true; emit('end'); }`) plus the immediate view switch prevent a second emit from the UI. One-line hardening (e.g., an `ending` flag or `if (currentSession) return;` once the session exists) closes the dependency on engine internals.

**F5 (low) — session-write failures are swallowed, contradicting the readable-error posture M6 guarantees.**
`recordSession` propagates any `store.put` rejection (store rejects on tx error/abort with a readable message, store.js:49-50), but the only consumer discards it: `.catch((error) => console.error(error))` (app.js:167). On a quota failure the user stays on the finished player view with no session recorded, no quiz, and no message — the readable message never reaches the UI (unlike the import path, which alerts at app.js:153). Mirror the import path: alert/announce on catch.

**F6 (low) — a zero-chunk text records a meaningless session (wpm 0) and an empty quiz.**
`openText` guards chapter count but not empty chapter text (app.js:74). Verified: `ingest({name:'empty.txt', ...})` returns one chapter `{"index":0,"title":"Full text","text":"","wordCount":0}` and `chunk(tokenize(...), {size:2})` yields `0` chunks; `generateQuiz('', {n:5, seed:1})` returns `0` questions (no throw, `scoreQuiz` guards `total=0`). The app then records `wordCount:0, wpm:0` (app.js:100-105), stores it, and shows the quiz view. No crash, but the bogus 0-wpm row enters dashboard metrics/trend and can yield a −10% suggestion. Fix: `if (!currentChunks.length) return;` in `openText` (plus a message if routing is expected).

---

## Notes (no action required)

- `activeMs` accounting caps each gap at `expected * 4 + 250` using the *current* wpm and the just-shown chunk (app.js:85-86); a brief (<cap) tab hide therefore counts as active reading time. Approximation, consistent with the "no fast-forward" requirement.
- `kind:'baseline'` is per text (app.js:107), which is a reasonable reading of §4 line 142; the plan does not define it globally.
- `#view-player`'s static sample `.rsvp-stage` in index.html:31 is removed by `root.replaceChildren(...)` (player-view.js:110) on first render — verified no duplicate stage.
- `validation/e2e-report.json`: 19/19 steps `ok:true` (boot single-section, import, EPUB gate, ORP anchor, no-prefill quiz scoring, persistence, reduced-motion default, contrast, zero external requests). Not treated as review evidence; used only to cross-reference the chapter-0 claim in F3.

## Artifact

`.autoforge/reviews/app.md` (this file).
