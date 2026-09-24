# Browser checklist (binding 7: manual cross-browser, no automation)

Automated coverage (headless Chromium) already proves function; this checklist
covers what automation cannot: real rendering, real input, real assistive tech.
Run before HC-C sign-off. Check each box with browser + version + date.

## Automated evidence (already green, reference only)

- `node --test` — 177/177 DOM-free lib suites
- `node .autoforge/validation/e2e-walkthrough.mjs` — 99/100 (only the missing
  `/tmp/pg1342.epub` fixture fails); includes zero-network + console-error gates
- `node scripts/a11y-checks.js` — 17/17 (keyboard, focus, announcements,
  contrast, reduced motion, gamify attributes, copy bans)
- `node scripts/harness-run.mjs test/harness/<page>.html --assert` —
  components 28/28, gamify 25/25, store-v2 11/11, dashboard-perf (budget <100ms)
- `node scripts/security-checks.mjs` — 6/6 static
- `node scripts/export-import.js` / `idb-failure.js` / `perf-large-book.js` — green
- Screenshots: `.autoforge/validation/screenshots/` (6 surfaces x 390/1280)

## Manual matrix

Browsers: current Chrome, Safari, Firefox (desktop) + one mobile (Safari or Chrome).
Widths: 320 / 390 / 768 / 1280. Review each surface at each width where marked.

- [ ] Library: import txt + epub + pdf + docx + paste + URL (+ fallback);
      search/filter/sort/favourite persist across reload; delete two-step;
      duplicate notice with Open; Resume banner → resume at saved chunk
- [ ] Player: autoplay; pause/resume/restart/skip; speed ±; chunk 1/2/3;
      goal chip live values; Session disclosure collapsed by default;
      `?` help; keyboard (Space/arrows/+/-/R/Esc) with focus in body AND in a button
- [ ] Quiz: answering inputs empty; submit → review verdicts + score;
      Edit expected answers → edited note + re-score; Done → summary;
      Cancel → dashboard + snapshot cleared
- [ ] Summary: 10-section order; heading focus visible; single announcement
      (VoiceOver/NVDA: exactly one "Session complete" utterance)
- [ ] Dashboard: stat row, challenges, two-series trend + bars (≥4 sessions),
      needs-4 note (1–3), empty + CTA (0), recent-50 toggle (>50),
      achievements grid, records list; HUD totals match log
- [ ] Focus mode: entering player hides header/nav/HUD; exiting restores;
      no keyboard trap in any view (Tab reaches all controls, Shift+Tab reverses)
- [ ] Reduced motion (OS setting on): RSVP static sentence mode, no autoplay;
      unlock/chart/rail static; no count-up anywhere
- [ ] Contrast spot-check: body text, marker-on-ink button text, placeholder
      verdicts, chart legend — all readable at full brightness and low brightness
- [ ] Offline: load once, disable network, reload from cache is NOT supported
      (documented: app is local-first after load, zero requests after boot);
      confirm no spinner/hang with network off post-load
- [ ] Corrupted data: (devtools → Application → delete `speedread` DB → reload)
      banner shows with Retry; Retry reboots cleanly
- [ ] v1 import: legacy export file imports with readable result; legacy
      session renders in the log; malformed JSON rejected readably, data intact

## Known human-only items (tracked, not automated)

- Screen-reader pass (ADR-16, tracked separately)
- Announcement quality/wording taste (attributes only are automated)
- 320px ultrawide extremes beyond 390/1280 screenshots
