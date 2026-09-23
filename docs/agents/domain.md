# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase. Single-context repo.

## Before exploring, read these

- **Glossary (canonical vocabulary):** `README.md` glossary line (RSVP, ORP = Optimal Recognition Point, chunking, perceptual span, baseline calibration, cloze), extended in `.autoforge/requirements/grilling.md` (Glossary section).
- **Architecture decisions (ADRs):** `.autoforge/architecture/decisions.md` (ADR-1..ADR-10: stack, storage, EPUB isolation, quiz design, timing, testing, accessibility, chunk policy, adaptive WPM, privacy/copyright).
- **Run state and evidence:** `.autoforge/state.json` (module map, verdicts), `.autoforge/validation/report.md` (acceptance), `.autoforge/decisions/log.md` (decision journal).

There is no root `CONTEXT.md` and no `docs/adr/` directory; the sources above serve instead. Per consumer rules: proceed silently, don't flag the absence.

## Use the glossary's vocabulary

When output names a domain concept (issue title, refactor proposal, hypothesis, test name), use the term as defined in the README/grilling glossary. Don't drift to synonyms the glossary avoids (e.g. ORP is Optimal Recognition Point, never "optical preview").

## Flag ADR conflicts

If output contradicts an existing ADR (e.g. adding a bundler contradicts ADR-1, cloud sync contradicts ADR-10), surface it explicitly rather than silently overriding.
