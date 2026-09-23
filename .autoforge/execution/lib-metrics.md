RE-DISPATCH: lib-metrics

Breach observed and fixed:
- Replaced CommonJS exports with ES module exports. Removed summarizeSessions alias.
- summarize now reads sessions as { wpm, comprehensionPct } and falls back to s.comprehension if comprehensionPct is absent.
- Guard semantics for wpm and comprehensionPct preserved exactly; 0 on invalid elapsed/total and non-finite results trimmed.
- Tests rewritten to ES Module style; coverage includes wpm, comprehensionPct, summarize with various shapes, suggestNextWpm, and purity checks.

Evidence (real command outputs from this environment):
- node --check src/lib/metrics.js
  exit code: 0
- node --test test/metrics.test.js
  Summary: 12 tests, 12 passed, 0 failed

Artifacts touched:
- src/lib/metrics.js (ESM export surface)
- test/metrics.test.js (ESM tests)
- .autoforge/execution/lib-metrics.md (this file) 
