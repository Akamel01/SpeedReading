# M-P05A player-prototype — review r2

**Module:** M-P05A (ticket 09) · **Artifacts:** `design/player-prototype.html`, `design/player-ux.md`, `.autoforge/execution/M-P05A.md`
**Contract:** `.scratch/speedreading-product-build/issues/09-player-prototype.md`, plan §M-P05A (plan.md:130-137), `design/direction.md` (frozen visual authority)
**Reviewer:** autoforge-reviewer (independent, read-only). No prior `M-P05A*.md` review exists in `.autoforge/reviews/`; this is the first recorded pass (named r2 per assignment).

## Verdict: CHANGES_REQUIRED

The prototype file exists and is hygienic, but `design/player-ux.md` is a 47-byte title-only stub, and the prototype is a static mock that uses an invented palette instead of the frozen direction. Two of the four ticket checkboxes ("spec covers every bullet, with a complete keyboard map"; implicit direction conformance) are unmet. Downstream ticket 14 (M-P05B player implementation) is blocked on this output.

## Evidence (independently reproduced)

**1. Serve + curl** (`python3 -m http.server 8080`, background, killed after):

```
http_code=200 bytes=5858 type=text/html     /design/player-prototype.html
ux_md_code=200 bytes=47                     /design/player-ux.md
```
Served body matches the working-tree file (same `:root` block, same 110-line file). Serves locally: PASS.

**2. Hygiene**
- Zero external resources: PASS — no `src="http`, `href="http`, `@import`, `fetch(`, no `https?://` in either file.
- `prefers-reduced-motion` block present (lines 44-46): PASS. Note it sets `transition:none !important` / `animation:none`, whereas direction.md motion rule specifies reduced motion = opacity-only ≤150ms, no transform. Minor divergence; acceptable only because the prototype has no real motion to degrade.
- Marker rule: not violated literally — `#FFDD33` appears nowhere, so no marker-on-light text. But this is vacuous: `--marker: #2b2b2b` (dark grey) is not the marker role. Marker role mis-defined.
- Direction palette: FAIL — zero direction.md values present (`#F6F4EC`, `#1A1815`, `#FFDD33`, `#E3DED2`, `#6B6B66`, accents: all absent). Invented values: `--paper #f7f3e9` (vs `#F6F4EC`), `--ink #1a1a1a` (vs `#1A1815`), `--accent #3a2a1a`, `#e5e0d0`, `#e3dac0`, `#e6d9bd`, `#e0d1a9`, `#f8f4e0`, `#fff5`, `#ddd`, `#bbb`, `#f4f4f4`, `#5a3e1a`, `#999`. The comment "design/direction tokens" (line 8) is false advertising.

**3. Rendering / overflow (throwaway CDP script `/tmp/m-p05a-check.mjs`, modeled on `.autoforge/validation/e2e-walkthrough.mjs`, `CHROME_PATH` Google Chrome, headless, device metrics 320x568 mobile / 1440x900 desktop, reduced-motion emulated):**

```
320x568   scrollWidth=322 innerWidth=322  overflow=false  rsvpStage=true  pause/resume/restart/skip=true
          speedStep=true  sessionGoalChip=true  resumeBanner=true  keyboardHint=false
1440x900  scrollWidth=1425 innerWidth=1440  overflow=false  rsvpStage=true  pause/resume/restart/skip=true
          speedStep=true  sessionGoalChip=true  resumeBanner=true  keyboardHint=false
```
No horizontal overflow at either width; all four required surfaces render: PASS (ticket checkbox 1 at the two tested widths).

**4. Spec coverage — `design/player-ux.md` contains only `# Player UX Interaction Specification (M-P05A)`.** Every required section is MISSING:

| Required by plan §M-P05A / ticket 09 | Status |
|---|---|
| State × control matrix | MISSING |
| Complete keyboard map | MISSING (prototype has a dead `.kbd` CSS class; no key is documented anywhere; CDP `keyboardHint=false`) |
| Progressive-disclosure rules (what stays visible vs. hidden) | MISSING |
| Mode definitions: focus/fullscreen, SR manual advance, reduced motion, typography, chunk size incl. experimental 3-word | MISSING (prototype shows four static chips and the string "chunk size: 120 words", which misstates the concept — chunk size is words per chunk, e.g. 1/2/3, not 120) |
| Session goal behaviour | MISSING (static chip text "Goal: Read 1 of 3 chapters • 45% complete") |
| Interruption/restore semantics against ADR-21 | MISSING (static banner "Resume where you left off"; no snapshot/cleared-on-record semantics) |
| Transitions with durations/motion notes | MISSING (no duration table; no use of `--dur-*` / `--ease-*`) |
| ADR-5 / ADR-7 / ADR-8 / ADR-18 preservation notes | MISSING (`grep -rn "ADR-5\|ADR-7\|ADR-8\|ADR-18" design/` returns nothing) |

**5. Prototype functional depth (ticket: "player prototype")**: the reading stage is a static paragraph ("This is a mock RSV(P) chunk…"); there is no chunk-at-a-time display, no anchored ORP column, no timer, no key handling, no goal progress, no restore behaviour. Buttons are inert. This is a layout sketch, not the prototype the ticket and HC-A batched review call for.

**6. Direction swappability** (critic M6): structurally satisfied — one inline `<style>` block (lines 7-50) covers all styling, so a rework pass can replace it in one block. Keep this structure; replace the values.

## Required changes (for the rework author)

1. **Write `design/player-ux.md` in full.** Minimum sections: (a) state × control matrix (`idle / restoring / playing / paused / chunk-complete / session-complete / interrupted` × `Space` play-pause, restart, skip, speed ±, chunk size, focus toggle, exit) with each cell's behaviour; (b) complete keyboard map table (key, scope, action, precedence vs. browser default, SR-manual interaction) including Space, Left/Right, Up/Down or `-`/`+` for WPM, R restart, Esc exit focus, `?` help if adopted; (c) progressive-disclosure rules: what is always visible (chunk, WPM, progress) vs. disclosed on demand (elapsed, remaining, section, settings); (d) mode definitions: focus/fullscreen (chrome hidden, restore on exit), SR manual advance (no auto-advance; announce at sentence boundaries per ADR-7), reduced motion (opacity-only ≤150ms, no transform, no count-up per direction.md), typography (font/size/leading options), chunk size 1/2/3 words with the 3-word path marked experimental; (e) session goal behaviour (set, live progress, completion, no guilt copy per ADR-18); (f) interruption/restore semantics (snapshot contents, land paused at restored chunk, elapsed from summed active time, snapshot cleared on record and quiz cancel — see ticket 14 criteria); (g) transitions with durations from direction.md (`--dur-press 100`, `--dur-status 150`, `--dur-view 180`, `--dur-tick 240`, `--dur-reward 320`, `--ease-calm`) and the "no animation on RSVP chunks" rule; (h) explicit ADR-5 (timing/active-time), ADR-7 (announcements at sentence boundaries), ADR-8 (chunk policy), ADR-18 (copy) preservation notes.
2. **Replace the invented palette with direction.md values** in the same single CSS block: `#F6F4EC` paper, `#FFFFFF` surface, `#E3DED2` border, `#1A1815` ink, `#6B6B66` muted, `#FFDD33` marker as background/highlight only (never text on light; text on marker = ink), `#A93226` focus/error, `#2A5A8A` info. Use direction.md type/space/radius/control-height scales; drop `#e6d9bd`-family browns and `#5a3e1a`. Correct `--marker` to the actual marker role.
3. **Make the stage a real RSVP mock**: single chunk at a time, ORP anchor at a fixed column, minimal JS timer with working pause/resume/restart/skip, speed steps in WPM (not `1.0x`), a chunk-size control demonstrating 1/2/3-word chunks, focus-mode toggle that hides the chrome and restores it, SR-manual toggle that stops auto-advance, session-goal progress that visibly moves, and a resume banner that demonstrates landing paused at a restored chunk. Keep it dependency-free and single-CSS-block swappable.
4. **Fix the reduced-motion branch** to match direction.md: opacity-only ≤150ms, no transform, no count-up (rather than blanket `transition:none`).
5. Update `.autoforge/execution/M-P05A.md` after rework so its claims match the artifacts; the current note ("spec: state x control matrix, keyboard map, interruption/restore, transitions, ADR-5/7/8/18 notes") describes content that does not exist.

## Gate status / blockers

- HC-A is a batched human gate (P01A + P05A + P06A) per `.autoforge/state.json:19`; no human reaction is expected inside this module and its absence is not a defect here.
- Downstream: ticket 14 / M-P05B is blocked by ticket 09. With an empty spec, the implementation module has no contract to freeze against — this review blocks that path until item 1 lands.
- Not blocking: `.autoforge/state.json` still lists M-P05A `pending` while artifacts exist; orchestrator bookkeeping, not artifact quality.
