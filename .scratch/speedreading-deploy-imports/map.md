# Map — speedreading-deploy-imports

Effort: make the trainer publicly accessible and widen import formats.
Upstream run: `speedreading-001` (GO). Related: `.scratch/speedreading-followups/` (ticket 09 superseded by 03 here).

## Notes

- Deploy = GitHub Pages from `main` branch root (static, no build). Easiest auto path: `gh repo create` + push + Pages branch source.
- Formats: txt/epub shipped; adding md (strip), docx (zip + document.xml), pdf (vendored pdf.js, offline kept), URL (fetch + paste fallback), paste (textarea).
- Posture holds: zero network after load except explicit user-initiated URL fetch.

## Decisions so far

- PDF via vendored pdf.js (offline kept; Apache-2.0 attribution in README).
- URL via direct fetch with readable-text extraction; CORS failure falls back to paste box.
- Public repo `Akamel01/SpeedReading`.

## Resolution

All seven tickets resolved 2026-09-23 (see `## Resolution` in each file). Release evidence: `node --test` 91/91, e2e walkthrough 25/25 GO, import-wave review APPROVED_WITH_NOTES, live at https://akamel01.github.io/SpeedReading/.

## Ticket index

| # | Ticket | Category | Status | Blocked by |
|---|---|---|---|---|
| 01 | nav-buttons | bug | ready-for-agent | none |
| 02 | github-pages-deploy | enhancement | ready-for-agent | none |
| 03 | paste-import | enhancement | ready-for-agent | none |
| 04 | md-import | enhancement | ready-for-agent | none |
| 05 | docx-import | enhancement | ready-for-agent | none |
| 06 | pdf-import | enhancement | ready-for-agent | none (decision made: vendored pdf.js) |
| 07 | url-import | enhancement | ready-for-agent | none (decision made: fetch + paste fallback) |
