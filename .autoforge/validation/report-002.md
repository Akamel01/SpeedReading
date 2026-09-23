criterion | verdict | evidence quote
| --- | --- | --- |
Node tests (node --test) | REPLAN | evidence: 109 tests run; quote: "ℹ tests 109" / "ℹ pass 109".
E2E Walkthrough (e2e-walkthrough.mjs) | GO | evidence: 39 passed, 0 failed -> GO.
Harness export/import (export-import.js) | REPLAN | evidence: 4 passed, 1 failed; note: import-wrong-schema failure (readable error) – ...
Harness accessibility checks (a11y-checks.js) | GO | evidence: 8 passed, 0 failed.
Harness IDB failure tests (idb-failure.js) | REPLAN | evidence: 4 passed, 1 failed; note: ui-recovery: bad import alerts readably via existing path, data intact.
Perf large book check (perf-large-book.js) | GO | evidence: verdict: PASS (budgets: tokenize+chunk<2000ms, heap<100MB).
Live URL / tokens.css | REPLAN | evidence: HTTP 200 for URL; tokens.css: token-folio missing.
