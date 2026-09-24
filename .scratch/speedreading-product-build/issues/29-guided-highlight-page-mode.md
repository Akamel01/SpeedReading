# 29: Guided-highlight page reading mode (default)

**Why (research, 2026-09-24):** user rejected the plain RSVP-only display. Market survey: the "guided highlight" family (Outread Guided Highlight, QuickReader, ReadLax phrase highlighting, Audeus two-layer highlight) keeps the full page visible and sweeps a highlight at the chosen pace — evidence: modest speed gains (10–30%) but **stronger comprehension** than RSVP, which loses context and drops comprehension at high speeds. Fits our ADR-18 evidence posture (no speed promises). Best-practice patterns: two-layer highlight (soft sentence + bright word/chunk), click-to-seek on the page, punctuation-aware dwell (Focal), ORP anchor kept (SpeederReader context strip).

**What to build:** a `page` reading mode (new default) in the player: chapter text rendered as a real page (serif, ~62ch measure, paragraphs), the current chunk highlighted with the marker, already-read text dimmed harder, the rest dimmed; auto-advance driven by the existing player.js engine; click any chunk to seek; auto-scroll keeps the focus line centred; windowed rendering (130k-word chapters stay fast). RSVP remains available via a Session-panel mode select. All existing hooks/timing/a11y preserved; reduced-motion keeps the manual sentence mode.

**Blocked by:** none (user-directed design change; supersedes the RSVP-only presentation of the HC-A player prototype for the default view).

**Status:** ready-for-agent

**Plan module:** post-run (S3 owner: M-P05B)

- [ ] Page mode default: page renders, current chunk highlighted, read text dimmed, rest dimmed
- [ ] Auto-advance + auto-scroll + click-to-seek; windowed render (no 100k-node DOM)
- [ ] RSVP toggle works; ORP assertions still green; reduced-motion unchanged
- [ ] Walkthrough asserts page mode; unit/a11y/harness green; screenshots reviewed

## Resolution

Closed 2026-09-24. Page mode built and default: chapter rendered as a page (62ch, serif, paragraphs), current chunk highlighted (marker + bold), read text dimmed (0.32), rest dimmed (0.55), windowed rendering (261 chunks max), auto-scroll centring, click-to-seek, RSVP toggle in Session panel (persisted via settings.readingMode). Research basis recorded (Outread/QuickReader/Audeus guided highlight; comprehension-preserving family). Evidence: walkthrough 103/103 GO (3 new page-mode assertions incl. click-to-seek + toggle), unit 177/177, a11y 17/17, harnesses green, screenshots reviewed (page + highlight visible). README notes the two modes honestly.
