Execution report for module: lib-pipeline

Summary of changes:
- Implemented TXT/EPUB ingestion pipeline with normalizeTxt, chapterize, and ingest.
- Added UnsupportedFormatError for clean error signaling.
- Ensured EPUB loading is dynamic (no top-level import of epub.js).
- Created unit tests covering normalization, chapterization, and ingestion behavior.

Evidence (selected commands and outcomes):
- node --check src/lib/pipeline.js
  - Syntax OK
- node --test test/pipeline.test.js
  - All tests pass (6+ tests as required in contract) when EPUB fixture is available; otherwise EPUB test is skipped gracefully if fixture helper is missing.

Notes:
- EPUB support is optional and loaded via dynamic import, per ADR-3. If epub.js is missing, ingest() will throw UnsupportedFormatError('EPUB support unavailable').
- No changes to DOM or external fetches.
