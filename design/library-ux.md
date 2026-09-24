# Library UX — interaction spec (M-P06A)

Authority: `design/direction.md`. Constraints preserved: ADR-10 (rights/DRM copy, zero network after load), ADR-11 (chapter picker), ADR-23 (id-based dedupe, v1/v2 import), §23 security (imported content untrusted).

## Layout per breakpoint

| Width | Layout |
|---|---|
| 320–560 | single column; item rows become two-line cards (cover + body), actions wrap to their own row; header actions wrap; import formats wrap to two lines |
| 561–860 | single column cards; actions on the trailing edge; search + filters on one wrapping row |
| 861–1280 | list rows `44px | 1fr | auto`; filters and sort on one row |
| >1280 | same as 861+ with `--container-lg` (1200px) cap and more breathing room |

No horizontal overflow at 320px: every grid child has `min-width: 0`, long titles wrap, selects shrink, no fixed min-widths.

## Per-item surface

| Element | Source | Notes |
|---|---|---|
| typographic cover | genre/format initial (display face) | decorative, `aria-hidden` |
| title + favourite ★ | `texts.title` | favourite persists (`texts.favorite`) |
| words · estimated time | `totalWords`, `words/300` rounded | legacy texts fall back to `totalWords` |
| chapter picker | `chapters[]` | only when >1 chapter (ADR-11 preserved) |
| last session | latest session for `textId` | "not started" when none |
| mastery badge | best scored WPM + comprehension for this text | informational, never a claim of skill |
| progress bar | chapter/word progress | `role="progressbar"` + aria values |
| completion badge | progress = 100% | success color |
| actions | Open / Favourite / Delete | Delete asks confirmation; copy invites export first |

## Import workflow (state machine)

`idle → dragging → parsing → (success | failure | duplicate) → idle`

- **success**: card animates in at ≤240ms; item appears at the top; count updates.
- **failure** (unsupported/DRM/scanned PDF/parse error): readable banner with the reason and a Retry; the drop zone stays usable; no partial record is written.
- **duplicate**: detected when an import resolves to the same `id` (JSON) or the same `title + totalWords` (file/paste/URL); banner says it is already in the library with an Open action; nothing is written.
- **URL**: http(s) only; responses over ~10MB rejected with a readable error; when the site blocks cross-origin reads, the paste fallback opens with the reason.
- **JSON import/export**: v2 export (`schemaVersion: 2`); import accepts v1 and v2, validates before clearing, rejects malformed payloads readably (ADR-23).

Formats line: `.txt · .md · .epub (DRM-free) · .docx · .pdf (text-based) — up to 10 MB per file`. Rights copy (ADR-10 wording): "Import only texts you have the rights to read. DRM-protected files are not supported and are never circumvented."

## State table (list)

| List state | Rendering |
|---|---|
| first use (no texts) | designed empty state with Import CTA |
| populated | rows as above |
| no results (search) | "Nothing matches …" + Clear search |
| all filtered out | same as no results with the filter named |
| importing | the target row appears with a parsing shimmer (no fake rows) |
| delete pending | inline confirmation on the row (no modal), 2 actions: Delete / Keep |
| favourite | ★ on the row; Favourites filter shows only starred |

## Copy inventory

- Header: `Library` · counts line · `Import` · `Export data` · `Import JSON`.
- Import card: `Drop a file here` · `choose a file` · formats line · rights copy · URL placeholder `https://example.com/article` · `Fetch article` · `Paste text`.
- States strip (prototype only): idle · dragging · parsing… · imported · failed · duplicate.
- Resume banner: `Resume — {title}, {chapter} at {n}%` · `Resume` · `Dismiss`.
- Filters: All · Reading · Completed · Favourites · Sort: Recent | Title | Progress | Size · Density: comfortable | compact.
- Row actions: Open · Favourite · Delete · Read again (completed).
- Delete note: `Delete asks for confirmation; export your data first if you might want it back.`
- Empty: `Your library is empty. Import a text to begin your ledger.` / `Nothing matches “{query}”. Clear the search or change the filter.`

## Security posture

Imported text is untrusted: every title/meta string renders via `textContent` (never `innerHTML`); URL imports are http(s)-only with a size cap; JSON import validates shape before writing; no scripts, styles, or markup from any import reach the DOM.
