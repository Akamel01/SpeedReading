# M-P03A persistence-v2 — final report (worker + orchestrator repair)

- `src/lib/store.js` v2: DB VERSION 2, additive `profile` store; exportAll -> {schemaVersion:2,...,profile}; importAll accepts 1|2, validate-before-clear, `invalid-record:<store>[i]` for malformed records, dup ids deduped, errors `schema-mismatch`/`invalid-field:<name>`/`invalid-record:<store>[i]`/`import-failed:<msg>`.
- `src/lib/profile.js`: createProfileRepository with load/save/markSeen/getActiveSession/setActiveSession/setUiPrefs; corrupt -> defaults + recovered; markSeen idempotent + returns the profile.
- `src/app.js`: profile repo in closure (window globals removed); ActiveSession snapshot `{sessionId,textId,chapterIndex,chunkIndex,wpm,chunkSize,elapsedMs,startedAt,savedAt}` written on visibilitychange-hidden/pagehide/beforeunload, cleared on session record; session id minted at openText and reused by recordSession.
- `scripts/harness-run.mjs`: real zero-dep CDP runner (the worker's first version was a mock) — serves repo, launches Chrome from CHROME_PATH, reads `window.__HARNESS__`, `--assert` exit code, `--shot`.
- `test/harness/store-v2.html`: 10 real in-browser assertions incl. v1 upgrade, v3 rejection, malformed record, dedupe, corrupt profile, markSeen idempotency, snapshot round-trip, upgrade-abort with prior data readable.
- Walkthrough: pagehide writes the snapshot; session record clears it; both asserted.
- Evidence: `node scripts/harness-run.mjs test/harness/store-v2.html --assert` -> 10/10 PASS, exit 0; `node --test` 175/175; walkthrough 51 passed / 1 failed (only `/tmp/pg1342.epub` fixture absent).
