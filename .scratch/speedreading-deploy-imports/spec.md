# Spec — speedreading-deploy-imports

## Objective

Anyone with the public URL can open the trainer (GitHub Pages), import txt/md/epub/docx/pdf/URL/pasted text, and navigate via working header buttons.

## Scope (in)

- Wire the four shell nav buttons to view routing (01)
- Public repo + Pages deploy from `main` (02)
- Paste box import (03; supersedes `speedreading-followups/09`)
- Markdown ingestion (04), DOCX ingestion (05), PDF ingestion via vendored pdf.js (06), URL fetch with paste fallback (07)

## Scope (out)

- Bundler/framework, backend, accounts, telemetry (ADR-1/ADR-10 hold)
- PDF rendering/OCR; DRM handling; URL proxying

## Acceptance

- Public URL serves the app; nav buttons route; each format imports with correct title/chapters/word count
- `node --test` green; e2e walkthrough extended and green
