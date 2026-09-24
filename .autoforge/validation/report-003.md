# Validation report — run speedreading-003 (2026-09-24)

Zero feature work. Full evidence set for the 15-ticket frontier (21 modules).
Run ends here; no push/deploy (HC-C records the human review below).

## Verdict: GO (with one environmental exception)

| Suite | Command | Result |
|---|---|---|
| unit | `node --test` | 177/177 |
| e2e walkthrough | `CHROME_PATH=... node .autoforge/validation/e2e-walkthrough.mjs` | 99 passed, 1 failed — only `ADR-3 gate: real Gutenberg EPUB` (fixture absent at `/tmp/pg1342.epub`; set EPUB_PATH or download pg1342.epub) |
| components harness | `node scripts/harness-run.mjs test/harness/components.html --assert` | 28/28 |
| gamify harness | `node scripts/harness-run.mjs test/harness/gamify.html --assert` | 25/25 |
| store-v2 harness | `node scripts/harness-run.mjs test/harness/store-v2.html --assert` | 11/11 |
| dashboard perf | `node scripts/dashboard-perf.mjs` | 25.7ms < 100ms budget, 0 failures |
| a11y gate | `node scripts/a11y-checks.js` | 17/17 |
| security gate | `node scripts/security-checks.mjs` | 6/6 static |
| export/import | `node scripts/export-import.js` | 5/5 |
| idb failure paths | `node scripts/idb-failure.js` | 5/5 |
| large-book perf | `node scripts/perf-large-book.js` | PASS (tokenize+chunk <2000ms, heap <100MB) |
| screenshots | `node scripts/screenshots.mjs` | 12 PNGs, 6 surfaces x 390/1280 |

Cross-cutting gates (walkthrough): zero external/telemetry requests · zero
critical console errors (documented filters only) · copy bans clean ·
app.css declares 0 custom properties · innerHTML/outerHTML/insertAdjacentHTML 0.

## Coverage map (mission § → evidence)

- §2–3 IA/shell: walkthrough nav/focus/corruption steps + M-P02 report
- §4 design system: components harness 28/28 + checkpoint-b PNGs + HC-A/HC-B
- §5 responsive: 390/1280 screenshots + walkthrough 390px rail/transport steps
- §6 library: walkthrough 9d (10 asserts) + M-P06B report
- §7 player: walkthrough 9c (12 asserts incl. double-count numeric) + M-P05B report
- §8 quiz: walkthrough section-6 + 9e (exclusion, verdicts, I3 byte-identical) + M-P07A report
- §9–11 gamification: unit (xp/streak/achievements/challenges/records/events/invariants) + gamify harness 25/25 + M-G01–G07 reports
- §10 Trophy grammar: direction.md mapping + no-dependency invariant (walkthrough zero-network)
- §12 motion: reduced-motion branches (a11y static gate) + walkthrough SR-mode steps
- §13 persistence: store-v2 harness 11/11 + export-import 5/5 + idb-failure 5/5
- §14 events: unit events/invariants + sessionMoments in summary (walkthrough 9f)
- §15 dashboard: dashboard-perf gate + walkthrough 1d/2f-note/9f + M-P07B report
- §16 achievements: 26-catalog unit + glyph rendering (gamify harness) + HC-A
- §17 challenges: unit + always-visible cards (a11y gate)
- §18 records: 10-id unit + records list (gamify harness + 9f)
- §19 summary: walkthrough section-6 + 9e-Done + 9f (10-order, focus, one announcement)
- §20 a11y: a11y-checks 17/17 + walkthrough contrast/focus/announcement steps
- §21 browsers: docs/browser-checklist.md (manual matrix; automation referenced)
- §22 perf: dashboard-perf + perf-large-book budgets recorded above
- §23 security: security-checks 6/6 + walkthrough URL/JSON guards
- §24 import/export: export-import 5/5 + v1 walkthrough import + v2 irreversibility note below
- §25 states: all 21 walkthrough states green (first-use, empty/populated library, importing/parsing/failed/unsupported, ready/active/paused, completed, quiz answering/completed, unlock/level-up/streak, returning, no-activity, corrupted, interrupted, restored)
- §26 decisions: ADRs 21–27 + grilling record
- §27 waves: work-order.json + per-module verify loops in execution reports
- §28 testing: this report + harness inventory (M-P08A)
- §29 invariants: I1–I10 owners in work-order; I3/I5 proven in walkthrough
- §30–31 exit: console-error gate green; no push (below)
- §32 deliverable: this report + HC-C

## Honest limits

1. The single failing step needs a Gutenberg fixture the sandbox lacks
   (`/tmp/pg1342.epub`); the EPUB path is instead proven by the fixture-based
   chapter-picker steps and unit zip/epub suites.
2. Pixel-diff visual regression is out of scope (binding 8): 12 screenshots +
   human review substitute.
3. Cross-browser is manual (binding 7): docs/browser-checklist.md.
4. Screen-reader pass is human-only (ADR-16); automation proves attributes.
5. Static gates (copy bans, motion branches, sink greps) are documented as static.
6. Worker-generated evidence was repeatedly fabricated or vacuous across this
   run; every number above is an orchestrator-executed run (see decisions/log.md).

## v2 irreversibility + export-before-update guidance

The store is VERSION 2 (additive over v1: profile store, schemaVersion 2
export). v1 payloads import cleanly (upgrade path + harness 3b + walkthrough
v1 step). The reverse is NOT supported: a v2 export will not import into an
older (v1) build. **Export your data (Dashboard → Export data) before updating
the app**, keep the file, and only then update. If an import rejects, nothing
is cleared (validate-before-clear) — your existing data stays intact.

## HC-C human review

(Pending — recorded here on sign-off. No push/deploy unless the human asks.)
