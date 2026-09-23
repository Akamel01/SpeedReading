# Module M-F06A — execution report (orchestrator repair; worker output discarded)

## Incident

Worker shipped a Playwright-requiring script (`require("playwright")` — not installed, violates zero-dep posture) with a mock-UI fallback that passes against fake DOM. Contract breach (§12).

## Orchestrator repair

Wrote `scripts/a11y-checks.js`: zero-dep CDP harness on the REAL app. Findings while building: this chrome-headless-shell build ignores `Input.dispatchKey` entirely (probed rawKeyDown+char into a focused input → zero events), so OS-trusted key-pipeline coverage is impossible headlessly; the harness proves the key MAP via in-page key events, focusability via programmatic focus in DOM order (Tab follows DOM order for native controls by spec), announcements/contrast/reduced-motion directly.

## Real evidence

```
$ node scripts/a11y-checks.js
PASS  keyboard: Space key map toggles playback (handler-level; OS-trusted pipeline uncovered headlessly — see header note)
PASS  keyboard: arrows/+/- handled, single view kept
PASS  announce: live region fires at sentence boundaries only — distinct announcements=2
PASS  focus: controls focusable in DOM order with visible outline + label — 12 stops checked
PASS  keyboard: Esc exits player to library
PASS  reduced-motion: manual sentence mode, no autoplay
PASS  contrast: body text >= 4.5:1 — ratio=18.88
PASS  page: zero uncaught page exceptions
8 passed, 0 failed
```

Human-only remainder (real screen-reader listening) untouched → M-F06H.
