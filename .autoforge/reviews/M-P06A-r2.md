# M-P06A library-prototype — review r2 (independent)

Verdict: **CHANGES_REQUIRED**

Artifacts reviewed: `design/library-prototype.html`, `design/library-ux.md`, `.autoforge/execution/M-P06A.md`.
Contract: `.scratch/speedreading-product-build/issues/10-library-prototype.md`, plan §M-P06A (`plan.md:139-149`), `design/direction.md`, ADR-10/11/23/26/27.

## Evidence run by this reviewer

| Check | Command | Result |
|---|---|---|
| Serves | `python3 -m http.server 8080` + `curl /design/library-prototype.html` | `HTTP 200 bytes=9351`; sha256 `c94f53da…a4e47` |
| Hygiene | grep `src="http`, `href="http`, `@import`, `fetch(`, `url(http`, `<script` | zero matches (no external refs, no script) |
| Reduced motion | grep `prefers-reduced-motion` | present, `:10` (`*{animation:none;transition:none}`) |
| Direction palette | grep `FFDD33\|F6F4EC\|1A1815\|color-bg\|color-accent` | **zero matches** |
| Render 320×568 | throwaway CDP (`/tmp/p06a-cdp.mjs`, model `e2e-walkthrough.mjs`), `mobile:false` | **FAIL** — `docScrollWidth 446 > innerWidth 320`; `SECTION.panel` renders 424px wide; offenders: `.panel/.resume/.searchRow/INPUT.search` |
| Render 320×568 (`mobile:true`) | same | `innerWidth` expands to 447 while `clientWidth` stays 320 — masks the same overflow; not a pass |
| Render 1440×900 | same | PASS — `scrollWidth 1425 <= innerWidth 1440`; search ✓, import action ✓, 5 `.list .item` rows ✓ |
| Network/console | CDP `Network.enable` + `Runtime` | one request (the page itself); no console output, no exceptions |

## Findings

1. **Direction not applied (blocking).** The prototype defines its own palette (`--ink:#0a0a0a`, `--paper:#f6f1ea`, `--accent:#3b2f2f`, progress fill `#3a7`) and its own type stack (Georgia/Times, Arial, monospace). `design/direction.md` is the frozen visual authority for this wave; not one role value appears. The "direction kept swappable (single small CSS block)" clause presumes the direction was applied in that block — it was not. Same defect exists in the sibling `design/player-prototype.html` (zero matches) — orchestrator should treat this as a G2-wave pattern, not a library-only slip.
2. **320px overflow (blocking).** Content min-width ≈446px. Root cause: at `max-width:860px` the item grid becomes `auto 1fr` while an item still has four children, so the `min-width:120px` surface and the three-button action row (`Fav/Open/Export`, ≈210px) land on one implicit row. The spec's stated mobile band is ≤600px; the prototype's only breakpoint is 860px, so spec and artifact disagree and neither holds at 320.
3. **Per-item surface incomplete.** Words ✓, est. time ✓ (`~5m read`/`4m`/`2m`), progress ✓, last session ✓, mastery ✓, actions ✓. **Completion: absent** (a 80% bar is not a completion affordance). **Favourite: absent as state** — only a `Fav` button, no starred/unstarred rendering, no `texts.favorite` semantics (§14 contract).
4. **Workspace controls incomplete.** Header/search/sort ✓. **Filter: absent from markup** — `.filters`/`.chip` CSS exists but no chips are rendered. **Density: absent** (plan §M-P06A names it). Header reads `Items: 6` while only 5 rows render (3 real + 2 "Workspace Placeholder").
5. **Import paths: copy-only for two paths.** `.txt/.md/.epub/.docx/.pdf` and paste are stated in copy; **URL and JSON appear only inside prose** (`URL import with paste fallback`, `… URL, JSON export/import`) with no control or state. Ticket 10's "every existing import path is represented" is met only at the level of text for URL/JSON.
6. **Import states exist but are unreachable.** All six (`idle/dragging/parsing/success/failure/duplicate`) exist as static divs, five with `display:none`, and the file has no `<script>` at all. Acceptable for a static HC-A prototype only if the human is meant to read source; if HC-A is a rendered reaction, states must be toggleable (e.g. `:target` or one inline script). Flagging as a coverage caveat, not a blocker by itself.
7. **Rights copy wrong (ADR-10 no-regression).** Required: "user must have rights to the text" + "DRM-protected files unsupported". Present: "This prototype requires no external resources. All imports treated as text for display." — a different claim. ADR-10's rights line is missing.
8. **Empty states incomplete.** One `.empty` div merges first-use and no-results into a single string; **all-filtered is absent** (named in plan §M-P06A).
9. **Chapter picker (ADR-11) not represented** in either artifact, though plan §M-P06A lists it as no-regression.
10. **Spec gaps.** `library-ux.md` covers breakpoints, a state table, the import machine, duplicate rule, delete/confirm, URL hardening, security posture — but: (a) the per-item table has no words/est. time/completion/favourite columns and no state dimension (never-opened / in-progress / completed / duplicate); (b) duplicate rule "matches existing title/identity within 1 second contact window" is incoherent and conflicts with ADR-23's id-based last-write dedupe — needs one rule; (c) plan's declared output is a "copy inventory", which is not present as a section; (d) no search/no-results behaviour, no favourites semantics, no resume-banner behaviour, no density/sort/filter inventory; (e) accessibility is one line (prototype's search input has placeholder-only labelling, no `aria-label`/`<label>`).
11. **URL size cap mismatch (explicit check).** Spec states **5 MB** (`library-ux.md:33`). ADR-27 §23 / verification spec states **~10 MB** (`decisions.md:401,410`). Prototype carries no cap figure at all. Reconcile to ADR-27's ~10 MB or record a supersession.
12. **Delete/confirm posture** present ("Delete this item? This cannot be undone.") but plan §M-P06A says "delete/confirm/**undo** posture" — no undo path stated.
13. Execution report `M-P06A.md` is thin but honest: it claims only what exists and marks HC-A pending. No fabricated verification. Fine.

## Required changes before re-review

1. Apply `design/direction.md` values inside the prototype's single CSS block (all role colors, the three font stacks, space/radius/elevation/control-height scales, focus ring `#A93226` 2px+2px, motion durations; marker `#FFDD33` background-only). Keep the block swappable.
2. Fix 320px: hold `scrollWidth <= innerWidth` at 320/375/768/1440. At minimum, drop the implicit-row layout at the mobile band (explicit grid areas or a stacked block layout) and let the action row wrap.
3. Add completion + favourite state to the per-item surface; add filter chips and a density control; correct the header count to the rendered row count.
4. Give URL and JSON real surfaces (input + paste-fallback affordance; export/import controls), not prose only.
5. Replace the rights copy with ADR-10's wording; add the all-filtered empty state; separate first-use from no-results.
6. Reconcile the URL cap to ADR-27 (~10 MB) in the spec; rewrite the duplicate rule to match ADR-23; add the missing spec sections (copy inventory, per-item state dimensions, search/no-results, undo posture, accessibility detail); state the chapter-picker surface (ADR-11).
7. Re-run: curl 200 + CDP at 320×568 / 375×812 / 768×1024 / 1440×900, plus a grep proving direction values are present.

HC-A (human reaction) is a separate gate and remains PENDING — not assessed here.
