# 08: verification — test, a11y, responsive, perf, visual-regression strategy

**Type:** task + research (AFK) · **wayfinder:task**
**Category:** enhancement
**Status:** ready-for-agent
**Blocked by:** none

## Question

What is the verification strategy that proves the mission's exit conditions in this repo?

- Unit/integration/E2E layering on `node --test` + zero-dep CDP harnesses (existing pattern: `scripts/*.js`, `test/harness/*.html`, `.autoforge/validation/e2e-walkthrough.mjs`).
- Property/invariant tests for the §29 list: where they live, how they run.
- Persistence E2E: refresh, tab close/reopen (CDP `Storage`/profile), export→clear→import recovery.
- A11y verification: automated attribute checks + contrast computation + keyboard walks (existing `scripts/a11y-checks.js` pattern); what still requires a human pass (ADR-16).
- Responsive verification: which viewports, what is asserted (overflow, tap targets, reflow at 200%/400% zoom).
- Cross-browser: which browsers are actually verifiable in this environment (Chrome headless available; Safari/Firefox caveats) and what the honest fallback evidence is.
- Performance budgets + measurement harness for dashboard/chart/large-library/long-document paths (existing `scripts/perf-large-book.js` pattern).
- Visual regression: options for a no-build repo (CDP screenshot diffs with a committed baseline?) and the recommendation.
- Security checks: imported-content handling (no unsafe HTML, URL validation, malformed JSON rejection) as automated assertions.

## Deliverable

Verification plan: commands, harness inventory, coverage map (mission criterion → evidence), honest limits. Feeds the architect's ADR and every execution wave's acceptance.

## Constraints

- No new dependencies if avoidable; screenshot diffing may need a decision (research).
- Harnesses must not break `node --test` discovery (prior incident: runners live in `scripts/`).
- CDP top-level-await and trusted-key limitations are known (decisions log #31).

## Out of scope

- CI service setup; cloud test infrastructure.

## Resolution

(pending)
