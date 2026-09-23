# Grilled Requirements for SpeedReading Trainer (Greenfield)

Objective restatement
- Build an in-browser speed-reading trainer that uses proven RSVP-style techniques to increase reading speed and comprehension, with 1-3 word chunking and parafoveal preview concepts. Grounded in the evidence base summarized in the discovery report; no backend or accounts in v1. This mirrors the discovery objective: show books/texts as 1-3 words at a time to train peripheral vision and comprehension (RSVP, parafoveal preview, metacognitive strategies).

Evidence-grounded scope anchor
- Discovery indicates strong evidence for RSVP and parafoveal preview as core levers, with metacognitive strategies and baseline calibration as important complements. See Discovery Report 3–4, 22–31, 36–45, 40–43, and Appendix sources. Also note the zero-tracker scope and read-only artifact constraint (Tracker Index: NONE; read-only surfacing).

Q/A table (question -> evidence-backed answer -> recommendation -> self-challenge)
| Question | Evidence | Answer | Recommendation | Self-challenge |
|---|---|---|---|---|
| 1. Which techniques belong in v1 vs later? Is peripheral vision training a claim or a framing? | Evidence: RSVP (strong); parafoveal preview (moderate-strong); metacognitive strategies (moderate). Peripheral training is cited as a longer-term calibration path (moderate). See Discovery Report sections 3 and Appendix 92-95. | Core v1: RSVP with 1-2 word chunks; ORP-based preview framing; baseline calibration; metacognitive training. Peripheral vision training remains with longer-term calibration as a roadmap, not a guaranteed v1 claim. | Put RSVP + 1-2 word chunks + baseline checks in v1; frame peripheral training as a longer-term calibration path, not a direct speed boost in all texts. | Could peripheral training be too risky to claim in v1 given heterogeneous literature? Propose phased milestones to validate 1- to 3-word chunk benefits per text type. |
| 2. How to measure comprehension meaningfully and prevent delusional high WPM? | Evidence: Knowledge emphasizes tradeoffs in speed vs comprehension; metacognitive training can help; baseline and retention checks are recommended by e.g., Klimovich 2023. See Discovery Report 22–35, 40–45. | Use retention quizzes tied to text passages; implement 1-2 short retention checks per chunked session; baseline WPM with periodic comprehension tests and spaced practice. | Implement a browser-based quiz per text with objective questions and a simple retake policy; ensure WPM is contextualized with comprehension metrics. | If quizzes are too easy, users may game the metric; add distractors and alignment with passage content. |
| 3. Chunk policy: 1 vs 2 vs 3 words; default; punctuation handling; adaptive rate? | Evidence: 1-3 word chunks align with parafoveal preview; literature shows mixed evidence; 1-2 word chunks reasonable starting point. See Discovery Report 44–46, 78–81. | Default to 1-2 word chunks with optional 3-word previews as an experimental toggle; adapt rate based on comprehension feedback and text complexity. | Start with 1-2 words; expose an advanced toggle to enable 3-word chunks after calibration. | Ensure adaptive rate changes do not disrupt comprehension tracking. |
| 4. Training loop: baseline calibration, progressive overload, spaced sessions, metrics display | Evidence: Baseline WPM, comprehension checks, spaced practice are recommended; educational measurement supports calibration; progression depends on text type (moderate evidence). See Discovery Report 40–43, 81. | Implement a simple baseline calibration (measure WPM on a baseline passage), then progressively increase target WPM with retention checks; include a visible progress dashboard. | Provide a browser-only progress view with text difficulty indicators and recent quiz results. | Avoid over-reliance on superficial speed metrics; ensure text-level retention is tracked. |
| 5. Text pipeline: formats, privacy, import, where content lives; copyright/DRM | Evidence: Privacy constraints noted; no DRM or PDFs in v1; importing TXT/EPUB; privacy implications minimal without data collection. See Discovery Report 53–57, 65–70, and 71–74. | Support TXT/EPUB import, simple text cleaning, chaptering; retain content only in memory or browser storage; no DRM circumvention; no cloud sync in v1. | Limit imports to DRM-free text and public-domain sources or user-owned texts; clearly label copyright considerations in UI; store text locally in IndexedDB/LocalStorage only. | If DRM/DRM-like protections block content, mark as a non-goal or instruct user to provide non-DRM sources. |
| 6. Accessibility (WCAG 2.2 AA); reduced motion; keyboard; screen readers | Evidence: Accessibility is a must for any UI; ensure reduced motion is supported; keyboard accessibility; screen-reader narrative for RSVP mode. See Appendix and WCAG-related guidance in the skillset. | Include: prefers-reduced-motion support, keyboard navigation, ARIA live regions for the RSVP stream, and clear focus outlines. | Implement accessible controls for font size, color contrast, and pause/play; ensure RSVP stream is announced by screen readers. | If accessibility conflicts with speed goals, prefer accessibility first as default. |
| 7. Non-goals / anti-scope | Evidence: Discovery indicates scope is read-only surface; no accounts, cloud sync, or LLM usage in v1; privacy constraints apply; DRM not supported. See Tracker Open Tickets; Next Steps. | Exclude accounts, cloud sync, social sharing, LLM-based quizzes, or DRM-skipping features in v1; keep data local. | Clearly label non-goals in UI and documentation; deprioritize future scope until validated. | If user demands one of these later, propose a targeted, gated plan with evidence review. |
| 8. Acceptance criteria for browser validator | Evidence: The acceptance should be testable in a browser; no telemetry; alignment with evidence-based techniques. | Define validator: (a) RSVP stream 1-2 words; (b) baseline WPM measurement; (c) retention quiz; (d) 4-week pilot plan; (e) no backend; (f) privacy-preserving storage. | Build a browser-only validator that runs offline; verify texts import and retention questions function; confirm no network calls. | Consider a longer-term pilot to assess transfer to real-world texts. |

Hidden / adjacent requirements
- Privacy: if user tests are added, consent and data minimization must be built in (Discovery Section 7). See Discovery 56-57.
- Copyright/licensing: ensure no DRM circumvention and that user-owned texts are used with proper rights (Discovery 5, 52-57).
- Accessibility-first design: WCAG AA basics to be baked into UI (Discovery 6).

Assumption register (confidence levels)
- A1: RSVP with 1-2 word chunks is a safe v1 starting point given parafoveal preview evidence. Confidence: High.
- A2: Baseline WPM + comprehension checks + spaced practice will yield measurable, modest gains with small risk to comprehension. Confidence: High.
- A3: 1-2 word chunks are preferable to 3-word chunks for initial product; 3-word preview is experimental. Confidence: Medium-High.
- A4: All content stays in-browser; no backend for v1; no telemetry. Confidence: High.
- A5: The MVP should be browser-only with TXT/EPUB support. Confidence: High.
- A6: Legal/privacy constraints will limit future features (accounts, cloud sync, DRM handling). Confidence: Medium.

MVP in / out
- In MVP scope (in):
  - In-browser RSVP viewer supporting 1-2 word chunks; optional 3-word toggle as experimental; ORP-aligned preview; baseline calibration on a sample text; retention quiz per text; local storage of progress; no backend; no accounts; no DRM circumvention; TXT/EPUB import; privacy-preserving data handling.
- Out of MVP (not):
  - Cloud sync, accounts, sharing, DRM handling, PDF/DRM content, non-text inputs (images, audio), or mobile app. No LLM-based quizzes in v1. (Discovery notes emphasize v1 scope and lack of trackers.)

Risks and mitigations
- Evidence gaps: direct 1 vs 2 vs 3-word chunk comparisons in live apps are not fully established; treat as exploratory (Discovery 48-51). Mitigation: implement A/B-lite tests in future v1 experiments.
- Copyright and privacy risk: must avoid DRM circumvention and data collection without consent (Discovery 55-57). Mitigation: local storage only; opt-in tests.
- Accessibility risk: RSVP stream must be keyboard accessible and screen-reader friendly (Discovery 6). Mitigation: build accessibility hooks early.
- Overclaim risk: peripheral vision training must be framed as a pathway and not guaranteed speed gains (Discovery 36-39). Mitigation: include caveats in UI copy and docs.

Escalation gates (with default decisions)
- Gate 1: Content rights issue (DRM restrictions or copyrighted text) becomes blocking. Default: escalate to human to select DRM-free content; pause feature, proceed with public-domain/test-text only.
- Gate 2: Privacy policy conflict or data collection plan conflicts with compliance. Default: pause feature until data-minimization plan approved; keep local-only by default.
- Gate 3: Ambiguity on chunk size efficacy (1 vs 2 vs 3) hinders release. Default: treat as experimental; ship 1-2 words; include a toggle to test 3-word preview in a controlled beta.
- Gate 4: Accessibility blockers (keyboard navigation or screen-reader not functioning). Default: halt and fix accessibility before release.
- Gate 5: Requirement that contradicts the discovery evidence (e.g., claiming large accuracy gains impossible). Default: revert to evidence-based framing; request clarifications.

Glossary (selected terms)
- RSVP: Rapid Serial Visual Presentation – showing words in sequence.
- ORP: Optimal Recognition Point – the character position in a word (typically left-of-center, ~1/3 in) the eye fixates first; aligning ORP at a fixed screen point reduces saccades. (Corrected by orchestrator: prior text said "Optical/Parafoveal Preview", incorrect.)
- ParaFoveal: Visual area surrounding fixation; enabling preview.
- Perceptual span: Reading window in which information is effectively perceived.
- Baseline calibration: Measuring baseline WPM for a user/text to calibrate progression.
- Metacognitive training: Strategy-based training to improve awareness and planning during reading.

Candidate acceptance criteria (browser validator)
- MVP reachable in-browser with no server: text import (TXT/EPUB), RSVP 1-2 words; ORP alignment; baseline WPM measurement; retention quiz per text; local progress tracking; no telemetry.
- Accessibility: all controls keyboard-navigable; RSVP stream announced to screen readers; reduced-motion support.
- Privacy: no data leaves the browser; local storage only; explicit consent for any future data collection if added.
- Documentation: glossary and design notes included; explicit mention of evidence-based rationale.

Artifact path
- This grill result documents the investigation and is stored at: .autoforge/requirements/grilling.md

--- End of grilling.md
