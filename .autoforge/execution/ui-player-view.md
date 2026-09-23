Module: ui-player-view
Status: implemented
What: RSVP renderer with keyboard map, SR/reduced-motion mode, and persistent settings for the SpeedReading app.
Evidence:
- src/ui/player-view.js exported createPlayerView(root, { onSessionEnd, onExit, onSettingsChange }): returns { start, showSrText, hide, renderSettings }.
- Subscribes to injected player events: 'chunk' (renders ORP parts and progress; announces sentence boundaries), 'end' (calls onSessionEnd), 'state' (updates Play label and progress).
- SR/reduced-motion: supports manual sentence navigation when prefersReducedMotion() is true or settings.reducedMotion === 'on'; renders sr panel with Prev/Next and aria-live polite region.
- Settings: font scale, text align, ORP highlight, chunk size, reduced motion; onSettingsChange invoked with partial settings on user interaction; renderSettings applies persisted values and CSS tokens (--font-scale, text-align).
- Keyboard: Space, Left, Right, +/- and Esc wired when view is visible; default to not auto-playing timers; ARIA region marked as aria-hidden for visual region.
How to verify:
- node --check src/ui/player-view.js (syntactic check).
- Serve harness: run a lightweight http server and curl the harness HTML; harness imports createPlayerView and wires a small 3-chunk fake player to demonstrate events.
