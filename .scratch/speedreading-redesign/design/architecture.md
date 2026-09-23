# Architecture decision — redesign code impact (ticket 10, grilled)

Report: `/var/folders/c8/816q70zd5dvd48_49_npqj8w0000gn/T/architecture-review-1790151334.html`
Grill: 5/5 frontier questions answered; frontier empty; shared understanding reached.

## Chosen candidates (all three, in grill order)

### A — DOM-builder module (grilled)

- Interface: `h(tag, attrs, ...children)` with `on: {event: handler}` listener shorthand and `class:` string.
- Placement: new module `src/ui/h.js` (own seam; every view imports it).
- Migration: NOT in the module ticket — each surface restyle migrates its own view to `h()` (blast radius stays inside the surface ticket).

### B — pure sentence + tick mapping in lib (grilled)

- `splitSentences(text)` moves from player-view into the text module with unit tests, IMPROVED now: abbreviation-aware (Mr/Mrs/Ms/Dr/St and friends no longer split sentences).
- `sessionTicks(sessions)` in the metrics module returns rich records `{wpm, comprehensionPct, best}` with unit tests.
- Views (SR mode, margin rail, tick strip) become thin renderers over these interfaces.

### C — token-layer CSS split (grilled)

- `styles/tokens.css` (`:root` custom properties only) + `styles/app.css` (consumes only), wired as two link tags. No build step.

## Test plan

- `h()`: structure assertions without a browser (nesting, attrs, listeners attached).
- `splitSentences`/`sessionTicks`: table tests incl. abbreviation cases and empty inputs.
- CSS split: byte check that `tokens.css` defines no selectors beyond `:root`; full unit suite + e2e green.

## ADR conflicts

None. All three respect ADR-1 (no build, no deps), ADR-6 (node --test for lib), ADR-7 (a11y gates unchanged).

## Deliberately not built

Player-view split, settings module, router module (each would be a hypothetical seam: one caller, no second adapter).
