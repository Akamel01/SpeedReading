# Module: app — execution report (orchestrator rewrite)

## Incident

Worker dispatch returned a fallback scaffold instead of the composition root (in-memory store shim, faux player, self-described "not executed" verification; explicit contract breach). Orchestrator rewrote src/app.js against the frozen contract.

## Implementation (src/app.js)

Composition root — no shims, no fallbacks:
- Boot: `openStore()`; load/persist settings record (id 'settings'); load texts/sessions; render library + dashboard; route library.
- Library: `ingest({name, arrayBuffer})` -> text record `{id, title, source, importedAt, chapters, totalWords}` via `store.put('texts')`; delete via `store.del`; export/import JSON (`store.exportAll` -> Blob download; confirmed `store.importAll` -> reload).
- Player: `chunk(tokenize(chapterText), {size})` -> `createPlayer({chunks, wpm})`; `playerView.start(...)`; exit pauses + routes library.
- Sessions: on player `end`, elapsed = endedAt - startedAt; wordCount from chunks consumed (`getState().index`); wpm computed; `kind:'baseline'` when the text has no prior sessions else `'read'`; full §4 session record persisted.
- Quiz: `generateQuiz(chapter.text, {n:5, seed})` -> quizView; on save `scoreQuiz` -> quiz record + session update (`quizId/correct/total/comprehensionPct`) -> dashboard with `suggestNextWpm` suggestion (when adaptiveSuggestions).
- Dashboard: render({sessions, suggestion}); explicit accept -> settings.wpm persisted; start-session -> open text.
- Visibility: `visibilitychange` -> `player.pause()`; settings changes persisted + `player.setWpm` for wpm.

## Real evidence

```
$ node --check src/app.js
(exit 0)

$ node --test
ℹ tests 75
ℹ pass 75
ℹ fail 0

$ python3 -m http.server 8088 + curl
index: 200
app.js: 200
store.js: 200

$ grep -n "fetch(\|setTimeout\|setInterval\|getElementById" src/app.js
(no matches, exit 1)
```

## Deferred

Browser interaction walkthrough (import -> baseline -> RSVP -> quiz -> dashboard -> reload persistence; visibility pause; JSON export/import) is G5 verify-acceptance's job — no interaction claim is made here.
