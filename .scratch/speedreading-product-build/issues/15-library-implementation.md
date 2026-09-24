# 15: Library implementation

**What to build:** Implement the frozen library prototype: search, filter, sort, favourite, per-item metadata (words, estimated time, progress, completion, last session, mastery), the import surface with its states (idle, dragging, parsing, success, failure, duplicates, recovery), empty states, resume banner, delete confirmation, and URL import hardening (http(s) only, size cap).

**Blocked by:** 10 (Library prototype), 11 (Design system implementation), 02 (App shell and navigation), 07 (Persistence v2 and profile), 14 (Player implementation), HC-A, HC-B.

**Status:** ready-for-agent

**Plan module:** M-P06B

- [ ] All import paths work (txt, md, epub, docx, pdf, paste, URL with fallback, JSON); legacy `totalWords` fallback preserved
- [ ] Duplicate detection; failure and unsupported banners with recovery; search/filter/sort/favourite persist; resume banner resumes; empty states; delete confirmation
- [ ] URL import rejects non-http(s) and oversize responses; no unsafe HTML APIs anywhere
- [ ] No-regression: chapter picker, zero-network posture, security posture; `node --test` green

## Resolution

Closed 2026-09-24 (W4). Orchestrator implemented directly. Review APPROVED_WITH_NOTES (file-branch dupe note fixed). Evidence: 10 new walkthrough assertions; walkthrough 72/1 (fixture only); unit 177/177.
