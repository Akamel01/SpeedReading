# Review: lib-orp (RE-REVIEW r2)

Verdict: **APPROVED**

Scope: restored `src/lib/orp.js` (30 lines) + `test/orp.test.js` (45 lines) after prior CHANGES_REQUIRED (stub overwrite, restored by orchestrator). Read-only review; no files modified.

Artifact hash: `ac057995f5aac48f4721467ba8ebf7b789e7aefa  src/lib/orp.js`

## Evidence

### 1. Tests
`node --test test/orp.test.js`:
```
ℹ tests 19
ℹ pass 19
ℹ fail 0
```
exit 0; all 18 parameterized cases (lengths 1,2,5,6,9,10,13,14,20 × index/concatenation) + 1 TypeError case pass.

`node --test` (full suite): `tests 64 / pass 64 / fail 0`, `SUITE_EXIT:0` — no regressions.

### 2. Own probe (independent of repo tests)
```
1 0 "[y]" true true
2 1 "y[y]" true true
5 1 "y[y]yyy" true true
6 2 "yy[y]yyy" true true
9 2 "yy[y]yyyyyy" true true
10 3 "yyy[y]yyyyyy" true true
13 3 "yyy[y]yyyyyyyyy" true true
14 4 "yyyy[y]yyyyyyyyy" true true
20 4 "yyyy[y]yyyyyyyyyyyyyyy" true true
"" TypeError orpIndex: true orpParts: true
42 TypeError orpIndex: true orpParts: true
```
All boundary lengths match contract (1→0, 2–5→1, 6–9→2, 10–13→3, ≥14→4); concatenation identity `left+orp+right === word` holds at every length; `''` and `42` both raise `TypeError`; index always within `len-1`.

### 3. Module format
`grep -n "module.exports\|require(" src/lib/orp.js test/orp.test.js` → empty (exit 1). Pure ESM, matches contract.

`shasum src/lib/orp.js` → `ac057995f5aac48f4721467ba8ebf7b789e7aefa  src/lib/orp.js`

### 4. Single source of truth
`grep -rln "orpIndex\|orpParts" src/` → `src/lib/orp.js`, `src/lib/player.js`. player.js only consumes: `import { orpParts } from './orp.js';` (line 6) and calls it (line 63). No other module redefines ORP constants (`grep "ORP_" src/` → empty). Confirmed.

## Findings
1. **No stub remnant.** Restored file is the full 30-line implementation; exports `orpIndex`/`orpParts` as named ESM exports; no dead stubs.
2. **Clamp at `orp.js:16` is unreachable for valid input** (`idx` never exceeds `len-1` under the branch table). Harmless defensive code; no action needed.
3. **`t()` helper at `test/orp.test.js:9-12` is unused** — trivial dead code in test file only; not a blocker.
4. Acceptance criteria fully covered: boundaries, identity, TypeError on empty/non-string, ESM-only, unique definition site.

## Required changes
None.
