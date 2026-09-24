# 07: Persistence v2 and profile

**What to build:** Versioned storage and profile: database v2 with an additive profile store, a profile repository owning seen-marking and the resume snapshot (written on pause/hide/exit, cleared when a session is recorded), export v2, import accepting v1 and v2, validate-before-clear, readable error strings, and the shared harness runner later tickets depend on. On upgrade failure the shell shows the readable recovery state and v1 data stays intact.

**Blocked by:** 02 (App shell and navigation).

**Status:** ready-for-agent

**Plan module:** M-P03A

- [ ] Harness: fresh v2 database; v1 upgrade additive with data intact; v2 export shape; v1 import wrapped into v2 defaults; unknown/newer version rejected readably; malformed record rejected; duplicate ids deduped; corrupt profile recovered with defaults
- [ ] Upgrade-abort simulated: store open rejects, v1 data still readable, shell renders the corrupted-data state
- [ ] Resume snapshot written on pagehide/pause and cleared on session record; seen-marking is idempotent
- [ ] `node --test` green; the existing v1 export/import acceptance is preserved

## Resolution

Closed 2026-09-23 (W1b). Orchestrator-repaired (real harness runner, validation, snapshot shape). Evidence: store-v2 harness 10/10; export-import 5/5.
