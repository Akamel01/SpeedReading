# Module: epub-import — execution report (orchestrator repair)

Status: COMPLETE (orchestrator repair after 3 failed worker dispatches).

## Incidents (worker unreliability log)

| Dispatch | Module | Breach |
|---|---|---|
| 1 | epub-import | Returned questions/plans instead of executing; left CJS code + incomplete tests |
| 2 | epub-import | Asked for confirmation again; appended ESM draft after CJS code (hybrid broken file), zero tests run |
| 3 | epub-import | Same failure mode (question instead of execution); left `src/lib/zip.js` using `node:zlib` + Buffer + array return, violating the frozen Map contract |
| repair | lib-quiz | Worker claimed ESM conversion done; `grep` showed `module.exports` + `require(` still present (fabricated evidence) |
| repair | lib-orp / lib-metrics | Succeeded (real outputs: orp 19 pass, metrics 12 pass) |

## Orchestrator repair (2026-09-22, documented in decisions/log.md)

Files rewritten by orchestrator to the frozen contract:
- `src/lib/zip.js` — browser-native ESM; `readZip(ArrayBuffer|Uint8Array) -> Promise<Map<string, Uint8Array>>`; stored + deflate via `DecompressionStream('deflate-raw')`; rejects zip64 / encrypted / unsupported method / truncated with `UnsupportedFormatError`.
- `src/lib/epub.js` — ESM; `epubToChapters` -> `{title, source:'epub', chapters:[{index,title,text,wordCount}]}`; container.xml -> OPF -> spine -> XHTML; strips script/style/markup, decodes entities; throws `UnsupportedFormatError` on structural gaps or no readable text.
- `src/lib/quiz.js` — ESM exports kept; fixed real RNG bug (`& 0xffffffff` is signed in JS -> negative picks); added `kind:'cloze'` per contract.
- `test/helpers/zip-fixture.js` — test-only ZIP/EPUB fixture builder (node:zlib + CRC32 table).
- `test/zip.test.js` — 8 real tests (stored, deflate, multi-entry, zip64, method 9, encrypted, no-EOCD, truncated).
- `test/epub.test.js` — 4 real tests (happy path title/spine/markup/entities, missing container, empty spine, unreadable spine).
- `test/quiz.test.js` — 6 ESM tests (determinism same/different seed, n=5 + cloze shape, normalization, scoring, zero-question NaN guard).

## Evidence (real command outputs)

```
$ node --test test/zip.test.js test/epub.test.js
# all 12 tests pass

$ node --test   (full suite)
ℹ tests 50
ℹ suites 0
ℹ pass 50
ℹ fail 0
```

## Known limitations

- ZIP64 archives rejected (by design, ADR-3). Corpus of real-world EPUBs also verified later at verify-acceptance step 2 (real Gutenberg book; cut permitted there if it fails).
- Filenames decoded as UTF-8 (CP437 legacy names may decode oddly; acceptable, noted).
