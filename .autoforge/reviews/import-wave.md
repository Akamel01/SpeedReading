# Import-wave review — article/docx/pdf + pipeline/library/app/nav

**Verdict: APPROVED_WITH_NOTES** — all contract checks pass on current files; notes are non-blocking hardenings.

## Evidence (real outputs)

- Targeted: `node --test test/article.test.js test/docx.test.js test/pdf.test.js test/pipeline.test.js` → `ℹ tests 24 / pass 24 / fail 0`.
- Full: `node --test` → `ℹ tests 91 / pass 91 / fail 0`.
- Vendor: `ls -l vendor/pdfjs/` → `pdf.mjs (658371 B)`, `pdf.worker.mjs (2209730 B)` — both present.
- View purity: `rg "store|fetch|XMLHttpRequest" src/ui/library.js` → only hit is line 99 comment `// URL import: fetch an article…`; no store/fetch calls in the view.
- Proxy check: `rg "proxy|localhost|fetch\(" src/app.js` → sole hit `src/app.js:197: response = await fetch(url);` — direct fetch, no proxy/backend.

## Contract checks (path:line quotes)

1. **Ingest dispatch** (`src/lib/pipeline.js:146-172`): `txt/md` → `normalizeTxt(ext==='md' ? stripMarkdown(raw) : raw)` (:149); `epub/docx/pdf` via `importOptional('./epub.js','EPUB support unavailable')` (:155), `'DOCX support unavailable'` (:161), `'PDF support unavailable'` (:167); unknown → `throw new UnsupportedFormatError(\`Unsupported file type: ${ext…}. Supported: .txt, .md, .epub, .docx, .pdf\`)` (:172). Probe: `ingest x.exe` → `UnsupportedFormatError: Unsupported file type: exe…` ✓.
2. **DOCX** (`src/lib/docx.js:44,85`): `if (!documentBytes) throw new UnsupportedFormatError('Not a DOCX: word/document.xml missing')`; `if (chapters.length===0) throw …('No readable text found in DOCX')`. Paragraphs in order via `matchAll(/<w:p\b…>([\s\S]*?)<\/w:p>/g)` (:54); headings via `w:val="Heading([1-9])"` (:33). Tests cover order/headings/missing/empty ✓.
3. **PDF** (`src/lib/pdf.js:23,44,50-53,71,89-90`): no-outline → `[{index:0,title:'Full text',…}]` (:23); outline via `pdf.getOutline()` (:71) grouped by `groupPagesToChapters`; `PasswordException → 'Encrypted PDFs are not supported'` (:50-52), catch-all → `Could not read PDF:…` (:53), empty → `'No readable text found in PDF (scanned-image PDFs need OCR)'` (:90). Worker same-origin relative: `pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdfjs/pdf.worker.mjs', import.meta.url).href` (:44) ✓. Garbage-input test rejects with `UnsupportedFormatError` ✓ (encrypted path code-read only — no encrypted fixture in repo).
4. **Article** (`src/lib/article.js:28,54-56,49-50`; `src/app.js:212`): chrome strip `…(script|style|nav|header|footer|aside|form|…)\b[\s\S]*?<\/\1>…` (:28); preference `innerOf(cleaned,'article')` → `<main>` → `role="main"` (:53-56); title `<title…>(…)</title>` split on ` [|-–—] ` (:49-50). 30-word gate is caller-side: candidates need `>= 30` words to win (:62) but final fallback is un-gated; enforcement lives in `src/app.js:212: if (words.length < 30) throw new Error('no readable article text found')` ✓.
5. **URL handler** (`src/app.js:177-242`): `parsed = new URL(url)` invalid → paste fallback (:178-185); `if (!['http:','https:'].includes(parsed.protocol))` + `'Only http(s) URLs can be fetched…'` (:186-190); `failToPaste` helper (:191-194) used for network (`:199 'Could not fetch that URL (network or CORS blocked it).'`), status (`:203`), and catch-all (`:241`). No proxy ✓.
6. **Library** (`src/ui/library.js:9,85-95,111-120,188-193`): `importInput.accept = '.txt,.md,.epub,.docx,.pdf'` (:9); paste-empty → `'Paste some text first — the box is empty.'` (:86-91); URL-empty → `'Enter a URL first.'` (:112-117); `showPaste(hint){…pasteArea.focus(); root.hidden=false;}` (:188-193) ✓.
7. **Nav** (`src/app.js:35-40,349-367`): `show(name){…section.hidden = key!==name…}` (:35-40, exactly-one-visible); `querySelectorAll('header nav button')` (:349) routes `player→show('player')` iff `currentText` (:352), `quiz→show('quiz')` iff `quizActive` (:356), `dashboard→renderDashboard+show` (:360-362), else `show('library')` (:365) ✓.

## Adversarial probes (code-read + live, quoted)

- **DOCX entity bomb**: `decodeXml` (`src/lib/docx.js:6-18`) is three single-pass `.replace()` calls over 5 named + decimal/hex numerics; no DTD/`<!ENTITY>` handling, no loop/recursion — billion-laughs input has nothing to expand. Live: 2000×`&amp;` payload → `DOCX_ENTITY_MS=2.1 OUTLEN=2008` (linear, correct single-level decode) ✓.
- **Markdown ReDoS**: emphasis patterns use lazy `(.+?)` with lookarounds (`src/lib/pipeline.js:116-117`). Live `'*'×5000+'a'` → `STRIP_TIME_MS=2.2 LEN=999` (also 3.1 ms repeat run) — no backtracking blowup ✓.
- **`javascript:` / `file:///`**: both rejected by the :186 protocol allowlist. Live `new URL` probe: `javascript:alert(1) → allowed=false`, `file:///etc/passwd → allowed=false`, `https://… → allowed=true` ✓.
- **10 MB paste**: no size cap in view or `ingest`; 10.8 MB `pasted.txt` → `BIG_MS=215 WORDS=1800000 CHAPTERS=1`, no crash/hang. Acceptable for local-first; see note N1.

## Findings (≤7)

- N1 (note): no paste/file size cap — 10 MB ingests in ~215 ms, so no DoS, but a 100 MB+ paste will still block the main thread during `normalizeTxt/chapterize`. Consider a soft cap or chunked ingest only if users report jank. Non-blocking.
- N2 (note): `showPaste` sets `root.hidden=false` without hiding siblings (`src/ui/library.js:188-193`); safety currently rests on every caller pairing `show('library')` first (verified at `src/app.js:182,187,192,239`). A future caller could break the invariant — consider hiding siblings inside `showPaste` or routing it through `show()`. Non-blocking.
- N3 (note): encrypted-PDF path (`src/lib/pdf.js:50-52`) verified by code-read only; no encrypted fixture/test exists. Garbage-input rejection is tested. Suggest adding a password-protected PDF fixture if one becomes available. Non-blocking.
- No `CHANGES_REQUIRED` items: dispatch strings, error types, worker path, allowlist, fallbacks, and accept-list all match contract on current files; 91/91 green.

**Artifact:** `.autoforge/reviews/import-wave.md`
