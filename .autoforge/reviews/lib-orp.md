# Review — module `lib-orp` (src/lib/orp.js, test/orp.test.js)

- Reviewer: autoforge-reviewer (independent, read-only)
- Date: 2026-09-22 ~20:39 PDT
- Artifacts reviewed at:
  - `src/lib/orp.js` — 516 bytes, mtime `Sep 22 20:38:13 2026`, sha1 `07221f5b19246bf0cb9a8f2f04eb6f0c451173f8`
  - `test/orp.test.js` — 1244 bytes, mtime `Sep 22 20:32:31 2026`, sha1 `cb9c41ccd94bbe311a31672dccd625b928e1c1e6`

## Verdict: CHANGES_REQUIRED

The current `src/lib/orp.js` is a placeholder stub. It does not implement the contract and the module's own test suite fails 19/19. A full, passing implementation existed in this same file earlier in this review session and was overwritten at 20:38:13 by an external writer (see Finding 4). Fix = restore a contract-conformant implementation, then re-run the suite. Do not trust `.autoforge/execution/lib-orp.md` — its claimed "pass 19" does not match the current tree.

## Required checks

### 1. `node --test test/orp.test.js`

Current run (20:38–20:39 PDT):

```
ℹ tests 19
ℹ suites 0
ℹ pass 0
ℹ fail 19
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
✖ orpIndex length 1 ... TypeError: orpIndex is not a function
✖ orpParts concatenation identity length 1 ... AssertionError: Expected values to be strictly equal: NaN !== 'x'
✖ TypeError cases for non-string and empty ... AssertionError: Missing expected exception.
```

First run in this session (before the 20:38:13 overwrite, same test file):

```
ℹ tests 19
ℹ pass 19
ℹ fail 0
```

### 2. Independent probe (boundaries 1,2,5,6,9,10,13,14,20 + identity + TypeError)

Probe against the current artifact aborts at first use — output verbatim:

```
typeof orpIndex = object | typeof orpParts = function
orpIndex value: [object Object]
TypeError: orpIndex is not a function
    at ...orp-probe.mjs:13:32
```

Boundary indices could NOT be probed on the current file because `orpIndex` is not callable. The boundary mapping was only exercised via the test suite against the earlier implementation (all 19 boundary/identity tests ✔ before the overwrite). No boundary evidence exists for the current artifact.

### 3. ORP logic location — `rg -l "orp|ORP" src/ -g "*.js"`

```
src/lib/player.js
src/lib/orp.js
```

`src/lib/player.js:6` is `import { orpParts } from './orp.js';` — a consumer, not a constants holder; no duplicated ORP constants outside `orp.js`. This check passes vacuously for the stub (it defines no ORP constants at all).

### 4. ESM check — `rg -n "require\(|module\.exports" src/lib/orp.js test/orp.test.js`

```
EXIT=1
```

No output: no CommonJS syntax in either file. Passes (both current and pre-overwrite states).

## Findings

1. **[Blocking] `orpIndex` is not a function.** `src/lib/orp.js:5` is `export const orpIndex = {}; // placeholder surface`. Contract requires a function returning 0/1/2/3/4 by length (1 | 2–5 | 6–9 | 10–13 | 14+, clamped to `length-1`). Test: `✖ orpIndex length 1 ... TypeError: orpIndex is not a function`.

2. **[Blocking] `orpParts` returns wrong shape; concatenation identity fails.** `src/lib/orp.js:7-11` returns `{ word, parts: [word] }`; contract requires `{left, orp, right}` with `left+orp+right === word`. Test: `AssertionError ... NaN !== 'x'` at `test/orp.test.js:35`.

3. **[Blocking] No input validation.** Stub has no `typeof`/empty-string guards (contract: `TypeError` on non-string/empty) and no clamp. Test: `✖ TypeError cases for non-string and empty ... Missing expected exception.` at `test/orp.test.js:43`.

4. **[Blocking/process] File mutated during review by an external writer.** `src/lib/orp.js` changed from the 44-line conformant implementation (my first read; suite 19/19) to the 516-byte stub at mtime `20:38:13`, mid-review. `src/lib/player.js` also changed at `20:39:25` (now imports `orpParts`). `zip.js` and `epub.js` also contain placeholder markers. Repo is not frozen; any verdict is only valid for the hashes above. Re-review required after writer freeze.

5. **[Note] Test oracle is shape-mirrored, not a literal table.** `test/orp.test.js:22-26` re-derives expected indices with the same branch structure as the intended implementation, so a shared misunderstanding of the mapping would pass unnoticed; the unused helper `t()` at `test/orp.test.js:10` is dead code. Non-blocking, but literal `{length: expectedIndex}` fixtures would be a stronger oracle. Also note `src/lib/player.js:55` calls `orpParts(w.word)` and consumes its result — the stub shape would break that consumer even if tests were adapted to it.

## Required changes (precise)

1. Freeze writers (the process that overwrote `orp.js` at 20:38:13 and touched `player.js` at 20:39:25 must be stopped or confirmed done).
2. Restore `src/lib/orp.js` to a single ESM module exporting `orpIndex` and `orpParts` that satisfies: mapping 1→0, 2–5→1, 6–9→2, 10–13→3, 14+→4 clamped to `length-1`; `orpParts → {left, orp, right}` with concatenation identity; `TypeError` on non-string/empty; no ORP constants anywhere else in `src/`.
3. Re-run `node --test test/orp.test.js` and paste real output showing `pass 19 / fail 0`; re-run `rg -l "orp|ORP" src/ -g "*.js"` and confirm only `orp.js` defines ORP.
4. Re-submit for review with fresh sha1 hashes of both files; this review is void for any later revision.

Evidence bundle note: `.autoforge/execution/lib-orp.md` claims a clean 19/19 ESM pass; that state was real earlier in this session but is no longer present on disk. Treat it as a claim, not proof, until the suite re-passes on a frozen tree.
