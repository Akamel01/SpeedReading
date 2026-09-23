# SpeedReading MVP Discovery Report (speedreading-002)

Scope: /Users/akamel/Documents/SpeedReading

Repo state (test suite reality-check):
- Node test suite present and reported in run 001 state: <state.json> indicates unit tests passed: 75/75; e2e tests: 19/19; validation suite GO. See state.json evidence: lines 8-12. Additionally, validation report states GO for the test criteria (node --test, e2e, etc.): .autoforge/validation/report.md lines 10-13, 16-18, 33-34. Evidence of e2e results is at /Users/…/.autoforge/validation/e2e-report.json.  
- The live site is https://akamel01.github.io/SpeedReading/ (source evidence: .autoforge/decisions/log.md item 32-33 notes live site).  
- The repo’s test suite is not executed by this discovery pass; refer to run 001 evidence.

 Frontier tickets (OPEN):
 - Followups (scratch-followups) 01-chapter-picker.md – ready-for-agent – blocked by: none
 - Followups 02-quiz-authoring-mode.md – ready-for-agent – blocked by: none
 - Followups 03-wpm-active-time-unit.md – ready-for-agent – blocked by: none
 - Followups 05-export-import-e2e.md – ready-for-agent – blocked by: none
 - Followups 06-sr-keyboard-verification.md – ready-for-human – blocked by: none
 - Followups 07-idb-failure-hardening.md – ready-for-agent – blocked by: none
 - Followups 08-large-book-perf.md – ready-for-agent – blocked by: none
 - Followups 09-paste-text-import.md – ready-for-agent – blocked by: none
 - Followups 10-span-training-mode.md – ready-for-agent – blocked by: none
 - Build 01-nav-buttons.md – ready-for-agent – blocked by: none
 - Build 02-github-pages-deploy.md – ready-for-agent – blocked by: none
 - Build 03-paste-import.md – ready-for-agent – blocked by: none
 - Build 04-md-import.md – ready-for-agent – blocked by: none
 - Build 05-docx-import.md – ready-for-agent – blocked by: none
 - Build 06-pdf-import.md – ready-for-agent – blocked by: none
 - Build 07-url-import.md – ready-for-agent – blocked by: none

Constraints (from repo facts):
- No code edits or git mutations in this pass; read-only discovery.
- Build/test posture: stand-in for future gates; live at https://akamel01.github.io/SpeedReading/ via Pages (from decisions log).
- Pinned tests exist: 91/91 baseline and 25/25 e2e after deployment; see run 001 state evidence (.autoforge/state.json) and validation report GO.

Unknowns and risks:
- Unknowns around edge-case coverage for accessibility verification (SR and keyboard passes) and IDB quota paths (validation/Investigation mentions unreached paths).
- Dependencies between tickets: redesign-build B1-B3 can proceed in parallel then S-chain per map; followups are largely independent except where they touch chapter/quiz design. See followups map notes in .scratch/speedreading-redesign/map.md and .scratch/speedreading-deploy-imports/map.md (state and dependencies).

Dependencies between tickets (high level):
- B1-B3 frontier require parallel design passes then architecture review (per map.md line 16).
- Followups 01-03,05-10 feed into the MVP’s core RSVP, text ingest, and accessibility tests; some followups are superseded by deploy-imports decisions (see deploy-imports map.md line 4).

Per-ticket scope confirmations (one-line each):
- 01-chapter-picker.md: Chapter navigation added; multi-chapter support validated by triage doc; status ready-for-agent.  (Evidence: 01-chapter-picker.md content)
- 02-quiz-authoring-mode.md: Adds an authoring surface for editing quiz expected answers separate from answering flow.  
- 03-wpm-active-time-unit.md: Extracts pause-excluded WPM timer into unit-tested function.  
- 05-export-import-e2e.md: Automation for export/import browser coverage and negative path handling.  
- 06-sr-keyboard-verification.md: Human verification pass to cover SR/keyboard accessibility gaps.  
- 07-idb-failure-hardening.md: Hardens storage failure paths with tests and recoverable UI states.  
- 08-large-book-perf.md: Defines a perf budget for large books with measure-first approach.  
- 09-paste-text-import.md: Paste-from-clipboard import path, value-add to import path.  
- 10-span-training-mode.md: Perceptual-span calibration drill framing as calibration path.
- 01-nav-buttons.md: Nav buttons wiring to switch views with fallbacks (deploy-imports map).  
- 02-github-pages-deploy.md: Public Pages deployment; Pages source in main; live at akamel01.github.io.  
- 03-paste-import.md: Paste text import path; import through ingest like files.  
- 04-md-import.md: Markdown import with headings becoming chapters.  
- 05-docx-import.md: DOCX import via in-repo zip reader.  
- 06-pdf-import.md: Vendored pdf.js for offline PDFs; outline-based chapters.  
- 07-url-import.md: URL fetch + article extraction; paste fallback.  

Constraints evidence: .autoforge/state.json, .autoforge/validation/report.md and .autoforge/decisions/log.md provide the high-signal gating data for this discovery.  

Artifacts:
- .autoforge/discovery/tracker-index.md
- .autoforge/discovery/report.md
