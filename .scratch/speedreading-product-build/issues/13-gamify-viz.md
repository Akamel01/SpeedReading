# 13: Progress visualisations

**What to build:** Hand-rolled WPM chart with deterministic downsampling at 1000 sessions, a personal-best podium (local only, ties to earliest), and the 10-record list. No chart dependency.

**Blocked by:** 12 (Gamification cards).

**Status:** ready-for-agent

**Plan module:** M-G05

- [ ] 1000-session fixture yields ≤120 chart points with deterministic buckets; readable at 0 and 1 sessions (no NaN path data)
- [ ] Podium shows 3 slots from ≥3 sessions; records list shows all 10 ids
- [ ] Empty states present; reduced-motion static branch verified
- [ ] No new dependency; no network calls

## Resolution

Closed 2026-09-24 (W2). Review APPROVED_WITH_NOTES (bucketing note fixed to ADR-25: 43 day buckets / 19 week buckets proven in harness). Evidence: 25/25 harness; unit 176/176; checkpoint-b/gamify-{390,1280}.png.
