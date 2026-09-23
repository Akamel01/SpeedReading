# SpeedReading — local-first RSVP speed-reading trainer

Static browser app (no build, no backend, no telemetry). Run: `python3 -m http.server 8080`, open http://localhost:8080/. Tests: `node --test` (Node >= 22.7).

## Agent skills

### Issue tracker

Issues live as local markdown under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. Glossary in `README.md` + grilling glossary; ADRs in `.autoforge/architecture/decisions.md`. See `docs/agents/domain.md`.
