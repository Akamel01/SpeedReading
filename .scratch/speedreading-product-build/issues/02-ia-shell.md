# 02: App shell and navigation

**What to build:** A real shell: persistent header and navigation (row on desktop, fixed bottom tabs under 768px, same DOM order, ≥44px targets), the active view exposed on the document body for styling, a player focus mode that hides navigation and HUD and restores them on exit, and a readable corrupted-data banner with Retry when storage fails to open.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Plan module:** M-P02

- [ ] Four views retained; nav row at 1280px and bottom tabs at 375px with ≥44px targets
- [ ] Player view hides chrome and restores on exit; Player and Quiz fallbacks intact
- [ ] Corrupted-data banner appears when storage open fails (simulated), with a working Retry
- [ ] `node --test` green; zero network requests after load

## Resolution

Closed 2026-09-23 (W1). Orchestrator-repaired; review M-P02-r2 findings fixed. Evidence: walkthrough nav/focus/corruption steps green; unit green.
