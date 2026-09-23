# Review: epub-import (`src/lib/zip.js`, `src/lib/epub.js`)

Date: 2026-09-22 · Reviewer: autoforge-reviewer (read-only) · Evidence: current working tree only.

**Verdict: APPROVED_WITH_NOTES** — contract bullets met; 12/12 module tests and 50/50 full suite pass; no `node:`/`require`/`Buffer` coupling, no DOM/fetch/import-time side effects. Five reproducible defects found, all in areas *outside* the literal contract (href resolution, uncommon entities, EOCD/UTF-8 flag robustness). None block the tested behavior; F1/F2 are the ones to fix before real-world EPUB exposure.

## Required checks (quoted)

**1. `node --test test/zip.test.js test/epub.test.js`**
```
ℹ tests 12
ℹ pass 12
ℹ fail 0
```

**2. `grep -n "node:\|require(\|module.exports\|Buffer" src/lib/zip.js src/lib/epub.js`**
```
src/lib/zip.js:3:// Contract: readZip(ArrayBuffer|Uint8Array) -> Promise<Map<string, Uint8Array>>
src/lib/zip.js:25:  return new Uint8Array(await new Response(stream).arrayBuffer());
src/lib/epub.js:2:// Contract: epubToChapters(ArrayBuffer|Uint8Array) -> Promise<{title, chapters:[{index,title,text,wordCount}]}>
```
Not literally empty: all three hits are the substring **ArrayBuffer** (a browser-native web type) in a comment/type line. Boundary-strict grep for actual offenders is empty:
`grep -nE "node:|require\(|module\.exports|\bBuffer\b|fetch\(|document\.|window\." src/lib/zip.js src/lib/epub.js` → `EXIT=1` (no matches). No DOM, no fetch, no import-time side effects (module top level is const tables only).

**3. `node --test` (full suite)**
```
ℹ tests 50
ℹ pass 50
ℹ fail 0
```
No regressions.

## Findings (all reproduced; repro scripts run against current files)

**F1 — MEDIUM · `resolveHref` ignores `..` path segments · `src/lib/epub.js:46-47`**
```js
46:   if (decoded.startsWith('/')) return decoded.slice(1);
47:   return baseDir ? `${baseDir}/${decoded}` : decoded;
```
A spine href of `../chapter.xhtml` (OPF nested below content) yields key `OEBPS/../chapter.xhtml`, never matches the archive map, the chapter is silently skipped, and a valid book rejects:
```
parent-relative href: THROWS UnsupportedFormatError | No readable text found in EPUB spine
```
Fix: fold segments after join, e.g.
```js
const parts = (baseDir ? `${baseDir}/${decoded}` : decoded).split('/');
const out = [];
for (const p of parts) { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); }
return out.join('/');
```

**F2 — MEDIUM · query strings not stripped from href · `src/lib/epub.js:39`**
```js
39:   const clean = href.split('#')[0];
```
Only `#anchors` are stripped. `href="c.xhtml?v=2"` skips the chapter:
```
query href: THROWS UnsupportedFormatError | No readable text found in EPUB spine
```
Fix: `const clean = href.split(/[#?]/)[0];`

**F3 — MEDIUM · common named entities left as literal text · `src/lib/epub.js:6`**
```js
6: const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
```
Real EPUBs use `&mdash; &ndash; &rsquo; &lsquo; &ldquo; &rdquo; &hellip;` heavily; they pass through undecoded into readable text (contract: "decodes entities"):
```
named entity: OK "H dash &mdash; here"
```
Fix: extend `ENTITIES` with the ~15 common XHTML named entities (no DOM parser needed, since DOM access is excluded).

**F4 — LOW · out-of-range numeric entity throws uncaught `RangeError` · `src/lib/epub.js:12`**
```js
12:       return Number.isFinite(code) ? String.fromCodePoint(code) : match;
```
`Number.isFinite` does not bound the code point:
```
huge numeric entity: THROWS RangeError | Invalid code point 4294967295
```
Malformed/crafted input escapes the `UnsupportedFormatError` contract surface. Fix: `code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match`.

**F5 — LOW · EOCD candidate not validated against comment-length invariant · `src/lib/zip.js:35-41`**
The backward scan accepts the first `PK\x05\x06` without checking `commentLen === bytes.length - candidate - 22`, so a *valid* archive whose comment (>22 bytes) contains the signature is rejected:
```
EOCD-comment THROWS UnsupportedFormatError | Corrupt ZIP: central directory out of range
```
Fix: accept only candidates where `dv.getUint16(i + 20, true) === bytes.length - i - 22`, else keep scanning.

**F6 — NOTE · UTF-8 filename flag (bit 11) ignored · `src/lib/zip.js:83`**
```js
83:     const name = decodeName(bytes.subarray(off + 46, off + 46 + nameLen));
```
Names are always decoded as UTF-8; CP437-flagged archives mojibake non-ASCII names to U+FFFD. Not a defect for EPUB input (OCF mandates UTF-8 paths), only a narrower-than-advertised general ZIP claim. Fix if general ZIP use arrives: branch on `flags & 0x800` with a CP437 table; otherwise document the UTF-8 assumption.

## Contract conformance
- `readZip` → `Promise<Map<string, Uint8Array>>`, method 0/8, zip64/encrypted/other-method/truncated all reject with `UnsupportedFormatError` + readable message (tests + fixture): PASS.
- `epubToChapters` shape `{title, source:'epub', chapters:[{index,title,text,wordCount}]}`, container→OPF→spine order, script/style/markup stripped, entities decoded (numeric; see F3): PASS for tested scope.
- Browser-native (no `node:`/require/Buffer), no DOM/fetch/side effects at import: PASS.

Skipped: no source edits made (read-only reviewer). Repro scripts live in the session temp dir, not the repo.
