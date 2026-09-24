# 26: Library fidelity to the approved prototype

**Gap (HC-C finding):** the live library is a plain bullet list; the HC-A-approved `design/library-prototype.html` shows card items with typographic covers, serif titles, meta rows, mastery/completed badges, progress bars, and a proper toolbar (chips, not bare selects), an import card with dropzone, header counts, and designed empty states.

**What to do:** restyle `src/ui/library.js` + `styles/app.css` S2 to the prototype: header shell (title + counts + Import/Export/Import JSON), import card (dropzone + URL/paste row + formats + rights copy), resume banner, list card (search + filter chips + sort + density), item cards (`44px cover | body | actions`, serif title, words · time · last, mastery badge, progressbar, chapter select, Open/Favourite/Delete), empty + no-results states. Keep all behavior, a11y (aria), copy, and token discipline (no custom properties in app.css).

**Blocked by:** 25 (bar fix first).

**Status:** ready-for-agent

**Plan module:** post-run repair (S2 owner: M-P06B)

- [ ] Prototype structure ported (cards, cover, toolbar chips, import card, states)
- [ ] Behavior unchanged (walkthrough 9d + section-2 asserts green)
- [ ] Screenshots 390/1280 match the prototype's structure; harness green

## Resolution

Closed 2026-09-24. Library rebuilt to the prototype: header shell (serif title + counts + Import/JSON/Export), import card (dropzone, formats, paste row, URL row, rights copy), list card (toolbar, item cards with cover/serif title/meta/mastery badge/progress bar/laps, actions), designed empty + no-results states, delete note. Also fixed: global `text-align: var(--text-align)` leaking the player's center alignment into all views; `.field` stretching the toolbar; danger buttons to outline; stray focus ring on `main` reading as a red rule. Evidence: walkthrough 100/100 GO; unit 177/177; a11y 17/17; components harness green; screenshots re-shot.
