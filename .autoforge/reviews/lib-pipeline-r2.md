# Review r2 — src/lib/pipeline.js + test/pipeline.test.js

SHAsum: `a5f02db995c08e44c91023b8ad8786c7e4997d5e  src/lib/pipeline.js`
Date: 2026-09-22. Read-only review; no repo edits.

## Verdict: APPROVED_WITH_NOTES

Prior CHANGES_REQUIRED items all verified fixed with executed evidence.

## Evidence

### 1. Test counts
`node --test test/pipeline.test.js`: `tests 9 / pass 9 / fail 0`.
Full `node --test`: `tests 75 / pass 75 / fail 0`.

### 2. Own probes (independent, real output)
```
A: chapterize('PART ONE\nCHAPTER 1\nOnce upon a time.')
   [{"title":"PART ONE — CHAPTER 1","text":"Once upon a time.","wc":4}]
B: chapterize('Real prose here.\nPart of this sentence continues.')
   [{"title":"Full text","text":"Real prose here.\nPart of this sentence continues.","wc":8}]
C: chapterize('Body text.\nChapter 9')
   [{"title":"Full text","text":"Body text.","wc":2},{"title":"Chapter 9","text":"","wc":0}]
D: chapterize('Chapter\nSingle line body')
   [{"title":"Chapter","text":"Single line body","wc":3}]
E: chapterize('')
   [{"title":"Full text","text":"","wc":0}]
```
- A: consecutive headings merge into one title without text loss. FIXED.
- B: mid-sentence "Part of ..." stays in body, not a heading. FIXED.
- C: trailing heading preserved as empty chapter. FIXED.
- D: bare heading + body preserved.
- E: empty input yields one empty "Full text" chapter — pre-existing fallback, no data to lose; not a regression.

### 3. Static checks
- `grep -n "import(" src/lib/pipeline.js` → single match: `121: const mod = await import('./epub.js');` — dynamic only.
- No static `import './epub.js'`; no `document`/`fetch(` references (grep matched only line 121).

### 4. ADR-3 cut path ("EPUB support unavailable")
No committed test (`grep -rn "EPUB support unavailable" test/` → NO_COMMITTED_TEST_FOR_CUT_PATH).
Reproduction outside repo: temp dir containing only a copy of `pipeline.js` (no `epub.js`/`zip.js`):
```
error: UnsupportedFormatError: EPUB support unavailable
name: UnsupportedFormatError
instanceof UnsupportedFormatError: true
```
Reviewer call: ACCEPTED as recorded coverage for this round. Branch is exercised, correct error class, and matches test-suite semantics for the sibling unknown-extension path. Recommend (non-blocking) a child-process fixture test so the branch is regression-guarded in CI.

## Findings (max 5)
1. [closed] Consecutive-heading title loss — fixed; test + probe A confirm merge `PART ONE — CHAPTER 1` with body intact.
2. [closed] Mid-sentence "Part of ..." misdetected as heading — fixed via `TITLE_FUNCTION_WORDS`; probe B confirms.
3. [closed] Trailing heading dropped — fixed; probe C yields empty chapter `Chapter 9`.
4. [note] ADR-3 cut path has no committed regression test; independently reproduced this round (evidence above), accepted as recorded coverage. Add a committed child-process test when touching ingest again.
5. [note] `TITLE_FUNCTION_WORDS` rejects legitimate titles like "Chapter of Secrets"; acceptable heuristic ceiling, revisit only if real books mis-split.

No other regressions observed; full suite 75/75.
