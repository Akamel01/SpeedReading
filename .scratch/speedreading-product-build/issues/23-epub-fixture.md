# 23: EPUB fixture for the ADR-3 gate

**What to do:** Provide `/tmp/pg1342.epub` (or set EPUB_PATH) so the walkthrough's `ADR-3 gate: real Gutenberg EPUB` step runs instead of failing on a missing fixture. Preferred: download the real public-domain Pride and Prejudice EPUB once, keep it outside the repo. Fallback if the sandbox has no network: document the exact download command in report-003.md and leave the step failing-environmental.

**Blocked by:** none (environmental; code complete).

**Status:** ready-for-agent

**Plan module:** M-P08B (evidence tail)

- [ ] Fixture present at `/tmp/pg1342.epub` or EPUB_PATH documented
- [ ] Walkthrough ADR-3 step green (or documented environmental fail)

## Resolution

Closed 2026-09-24. Fixture downloaded to `/tmp/pg1342.epub` (noimages variant, 558KB — the 24MB images variant times out the import step). ADR-3 step green: Pride and Prejudice, 130,614 words. Walkthrough 100/100 GO.
