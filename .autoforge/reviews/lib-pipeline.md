# Review — module `lib-pipeline` (src/lib/pipeline.js, test/pipeline.test.js)

- Reviewer: autoforge-reviewer (independent, read-only)
- Date: 2026-09-22 ~20:42 PDT
- Artifacts reviewed at (current tree):
  - `src/lib/pipeline.js` — 3741 bytes, mtime `Sep 22 20:41:37 2026`, sha1 `3e564fc8df12bb1c98f29864df30bb0eb5467a11`
  - `test/pipeline.test.js` — 2386 bytes, mtime `Sep 22 20:41:38 2026`, sha1 `9b4db1c8a09bff1d156f1d79c9bc48c942cb5e62`
- Supporting reads: plan.md §1/§2 M10 + §1c.7, ADR-3 (`decisions.md`), `src/lib/epub.js`, `test/helpers/zip-fixture.js`
- Note: decisions log #10 records the orchestrator editing `pipeline.js`/test itself; this review makes no trust assumptions about that pass.

## Verdict: CHANGES_REQUIRED

All headline contract bullets pass (normalization, dispatch, shapes, dynamic-import-only EPUB, ESM/purity, 6/6 module + 64/64 full suite green, ADR-3 cut path verified manually). Two defects block approval: **heading text is silently discarded in realistic layouts** (contract: "no content loss"), and the M10 acceptance criterion for the ADR-3 cut path has **no committed test** in `test/pipeline.test.js`. Both fixes are small and localized.

## Required checks (quoted real output)

### 1. `node --test test/pipeline.test.js` / full `node --test`

```
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ duration_ms 84.597916
```
```
ℹ tests 64
ℹ suites 0
ℹ pass 64
ℹ fail 0
ℹ duration_ms 214.259583
```
No regressions in the rest of the suite.

### 2. Static checks

```
grep -n "epub" src/lib/pipeline.js
91:// Supported: .txt (utf-8) and .epub (dynamic load)
104:  if (ext === 'epub') {
106:      const mod = await import('./epub.js');
107:      const book = await mod.epubToChapters(arrayBuffer);
108:      return { title: book.title || title, source: 'epub', chapters: book.chapters };

grep -n "^import\|import(" src/lib/pipeline.js
106:      const mod = await import('./epub.js');

grep -n "document\|window\|fetch(" src/lib/pipeline.js   -> exit 1 (no matches)
```
Single dynamic import at line 106, inside `try {` (105) / `catch` (109); no static import; no DOM/window/fetch. `package.json` is exactly `{"type":"module"}`; module is pure ESM.

### 3. Independent probes (main tree, Node v26.7.0)

- Content-loss check on mixed headings — `chapterize('Intro line\nCHAPTER 1\nThe cat sat.\nPart Two\nDog ran.\n## End\nFinal words.')`:
  `[{"i":0,"t":"Full text","n":2},{"i":1,"t":"CHAPTER 1","n":3},{"i":2,"t":"Part Two","n":2},{"i":3,"t":"End","n":2}]`
  `body lines all present true`; `heading texts in titles [true,true,true]` — indices 0-based, heading text recoverable as title.
- CRLF-only: `normalizeTxt('A\r\nB\r\nC')` -> `"A\nB\nC"` (correct). Direct `chapterize('A\r\nB')` -> `["A\r\nB"]` (see F4).
- Only `§ 1`: `[{"index":0,"title":"Full text","text":"§ 1","wordCount":2}]` (fallback used; see F5).
- `.TXT` uppercase: `ingest({name:'BOOK.TXT'})` -> `{"title":"BOOK","source":"txt","chapters":1,"wc":2}` — extension case handled.
- `.epub` fixture (`buildEpubFixture`, method 0 + 8): `{"title":"Test Book","source":"epub","chapters":[{"i":0,"t":"Chapter One","wc":8},{"i":1,"t":"Chapter Two","wc":9}]}` — title from OPF metadata, chapter titles from `<h1>/<h2>`, markup/script/style stripped.
- Adversarial: `normalizeTxt('')` -> `""`; `chapterize('')` -> `[{"index":0,"title":"Full text","text":"","wordCount":0}]`; 0-byte `.txt` -> `{"title":"empty","source":"txt","chapters":[{"index":0,"title":"Full text","text":"","wordCount":0}]}` — no throws, no NaN. `ingest({name:'noext'})` -> `UnsupportedFormatError: Unsupported file type: ` (label empty; acceptable).
- ADR-3 cut path (manual, temp dir copy of `pipeline.js` with no `epub.js`):
```
module loads sans epub.js: true
err name: UnsupportedFormatError | message: EPUB support unavailable | instanceof: true
txt still works: txt
```
Never leaks raw `ERR_MODULE_NOT_FOUND`; TXT path loadable without `epub.js`.

## Findings

1. **F1 (blocking) — heading text silently dropped when a heading has no body; contract "no content loss" violated.**
   `PART ONE\nCHAPTER 1\nOnce upon a time.` -> `[{"index":0,"title":"CHAPTER 1","text":"Once upon a time.","wordCount":4}]` — `PART ONE` appears nowhere in the result. `Body text.\nCHAPTER 2` -> `[{"index":0,"title":"Full text","text":"Body text.","wordCount":2}]` — `CHAPTER 2` gone. Cause: `pushChapter()` no-ops when `currentLines.length === 0`, so a pending `currentTitle` is overwritten by the next heading or dropped at EOF. Part/Chapter nesting is a common book layout, not a contrived case.
   *Fix (minimal):* track the pending heading line; in `pushChapter()` and the final flush, emit a chapter for a pending title that never received body lines (`{index, title, text: headingLine, wordCount}`) instead of discarding it. Do not simply fold the line into the next chapter's body — heading-as-title is the established shape.

2. **F2 (blocking, same root cause, distinct trigger) — `/^(chapter|part)\b/i` consumes ordinary prose and loses it.**
   `Real prose here.\nPart of this sentence continues.` -> `[{"index":0,"title":"Full text","text":"Real prose here.","wordCount":3}]` — the second line vanishes from every `text`. Any body line beginning "Part …"/"chapter …" is treated as a heading and (per F1) discarded when nothing follows it.
   *Fix:* keep F1's never-discard guarantee, and tighten the heuristic to heading-shaped lines only (short line, optional number/roman/`One`-style word, no sentence-final punctuation), e.g. require `/^(chapter|part)\s+([\divxlcdm]+|one|two|…)\s*$/i` or at minimum a line-length bound.

3. **F3 (blocking acceptance gap) — no committed test for the ADR-3 cut path.**
   M10 acceptance explicitly requires: with `epub.js` absent, module loads cleanly and `.epub` ingest rejects with `UnsupportedFormatError('EPUB support unavailable')`, never raw `ERR_MODULE_NOT_FOUND`. `test/pipeline.test.js` has 6 tests; none exercises the absent-module path (the EPUB test runs with `epub.js` present). I verified the behavior manually (output above), but per "no approve without evidence" the criterion needs either a committed test or an explicit orchestrator decision to accept this review's manual probe as the cut-gate record.
   *Fix:* add one test that copies `src/lib/pipeline.js` into a fresh `fs.mkdtemp` dir, imports it there, asserts `ingest({name:'x.epub',...})` rejects with `UnsupportedFormatError` / message `EPUB support unavailable`, and that an adjacent `.txt` ingest still returns `source:'txt'`.

4. **F4 (note, no action required now) — `chapterize` assumes normalized input.**
   `chapterize('A\r\nB')` returns text `"A\r\nB"`; a `\r` can ride into titles (`replace(/^#{1,3}\s*/…)` leaves `\r` at end of a CRLF markdown heading title). Contract chain is `normalizeTxt -> chapterize` and `ingest` follows it, so this is latent only. If `chapterize` is ever called directly on file bytes (e.g. M14/app), run `normalizeTxt` first or strip `\r`.

5. **F5 (note, no action required now) — word-count cosmetics on symbol-only fallback.**
   `chapterize('§ 1')` -> `wordCount: 2` (counts `§` as a word). Harmless for the single-chapter fallback; mention only because `wordCount` feeds WPM metrics downstream.

6. **F6 (info) — no `text.js` import.** M10 lists `blocked_by: lib-text`, but nothing in the frozen contract requires `pipeline.js` to use `tokenize`; `wordCount` is implemented inline (`split(/\s+/)`). No action; note for the DAG only.

## Verdict rationale

- Passes: normalization (BOM/CRLF/blank-run/trailing trim), 0-based `Chapter{index,title,text,wordCount}` shape, `ingest` dispatch and returned shapes, unknown-extension error, uppercase extension, EPUB via dynamic import only with metadata title, module purity (no DOM/fetch/static EPUB import), ESM importability, empty/0-byte safety, ADR-3 cut behavior (manually proven), no suite regressions.
- Fails: F1/F2 are real content loss outside the "no body text lost" probe I ran on well-formed input; F3 is an unmet acceptance criterion. Re-review after the F1/F2 fix + F3 test: re-run `node --test test/pipeline.test.js` and `node --test`, plus the F1/F2 probes above; expect 7/7 and 65/65.
