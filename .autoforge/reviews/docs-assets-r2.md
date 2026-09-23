# Review r2: docs-assets (README.md, assets/sample.txt, execution note)

Reviewer: autoforge-reviewer (independent, read-only).
Date: 2026-09-22. Re-review after CHANGES_REQUIRED (`.autoforge/reviews/docs-assets.md`).

## Verdict: APPROVED

All three blocking findings from r1 are fixed, verified against real command output. No new defects.

### 1. [PASS — was HIGH] Node >= 22.7 + test command present and working

`README.md:6`: `- Tests: node --test (requires Node >= 22.7; zero dependencies)`

Exact documented command run:
```
$ node --version
v26.7.0
$ node --test
ℹ tests 75
ℹ pass 75
ℹ fail 0
```
75/75 pass, 0 fail. Matches the execution note's quoted counts exactly (`.autoforge/execution/docs-assets.md:22-24`).

### 2. [PASS — was MED] Execution note factual

- Claim "404 words" ↔ real `wc -w assets/sample.txt` → `404` (`.autoforge/execution/docs-assets.md:11,16-17`).
- Claim `file` output `ASCII text, with very long lines (1226)` ↔ real output identical.
- Claim `ℹ pass 75 / ℹ fail 0` ↔ real test output identical (quoted above).
- Fabricated r1 claims ("333 words", "headings found", "simulated here for audit") are gone; the note now records the r1 outcome and fix honestly (`docs-assets.md:1-11`).

### 3. [PASS — was MED] Sample is public-domain text, provenance note removed from body

`assets/sample.txt` is the opening of the U.S. Declaration of Independence (1776): line 1 "When in the Course of human events..."; line 3 "We hold these truths to be self-evident..."; line 5 "The history of the present King of Great Britain...". Well-known public-domain text; no readable bracketed provenance line remains in the stream (the r1 defect). The note records the swap and licensing basis (`docs-assets.md:11`). First line is the source text itself, not a provenance label — acceptable per this check's fallback: text verified as the public-domain Declaration opening.

Other checks:
- `wc -w assets/sample.txt` → `404` (within required 300-500).
- `file assets/sample.txt` → `assets/sample.txt: ASCII text, with very long lines (1226)` (ASCII ⊂ UTF-8).
- No overclaim: `README.md:8` "peripheral/perceptual-span framed as calibration pathway NOT guaranteed speed boost".
- ORP defined: `README.md:9` "ORP = Optimal Recognition Point".
- Coverage lines: run `README.md:4`, tests `:6`, privacy `:7`, evidence `:8`, glossary `:9`, non-goals `:10`, rights/DRM `:11`, 4-week pilot `:12` — all present; execution-note line mapping is accurate.

## Findings

1. None blocking.
2. [INFO] Sample has no in-file provenance line (by design, to keep it out of the RSVP stream); provenance lives in the execution note + README context. If a machine-readable provenance is wanted later, add a sidecar (e.g. `assets/sample.LICENSE.txt`), not an in-body line.
3. [INFO] r1 adjacent flag (index.html references `./src/app.js`, missing) remains outside docs-assets scope; not re-verified here and does not affect this module's acceptance.

Artifact: `.autoforge/reviews/docs-assets-r2.md`
