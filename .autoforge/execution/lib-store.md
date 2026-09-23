Module: lib-store
 ADR: ADR-2 (IndexedDB wrapper)

What I built
- A minimal, dependency-free wrapper around IndexedDB exposing a Store with methods:
  - put(store, rec)
  - get(store, id)
  - getAll(store)
  - del(store, id)
  - exportAll()
  - importAll(json)
- openStore() -> Promise<Store> returning a Store instance bound to DB name 'speedread', version 1 and object stores: texts, quizzes, sessions, settings (all keyPath 'id').
- exportAll() yields { schemaVersion: 1, texts, quizzes, sessions, settings }.
- importAll(json) validates json.schemaVersion === 1; on mismatch returns { ok:false, error:'schema-mismatch' }. Otherwise replaces all stores with provided data. No auto-confirmation prompts here.
- No DOM access at import time; IndexedDB used only when methods are executed.
- No fetches, no telemetry, no other listeners. Small surface area (~150 lines in JS).

How to verify (evidence commands and expected output)
- 1) Typecheck
  - Command: node --check src/lib/store.js
  - Expected: exit code 0 (no syntax errors).
- 2) Dynamic import surface
  - Command: node --input-type=module -e "const m = await import('./src/lib/store.js'); console.log(Object.keys(m))"
  - Expected Output: [ 'openStore' ]
- 3) IndexedDB usage surface
  - Command: grep -rn "indexedDB" src/
  - Expected Output: src/lib/store.js:<line> contains indexedDB usage (e.g. 'const req = win.open(...)')

Files touched
- src/lib/store.js
- .autoforge/execution/lib-store.md
